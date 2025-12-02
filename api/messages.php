<?php
// sistema_voluntariado/api/messages.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['action'])) {
        switch($_GET['action']) {
            case 'get_user':
                // Obtener mensajes de un usuario (conversaciones)
                $user_id = $_GET['user_id'];
                
                // Obtener todas las conversaciones del usuario
                $query = "SELECT m.*, 
                         u1.nombre as remitente_nombre, u2.nombre as destinatario_nombre,
                         CASE 
                             WHEN m.remitente_id = ? THEN m.destinatario_id
                             ELSE m.remitente_id
                         END as otro_usuario_id,
                         CASE 
                             WHEN m.remitente_id = ? THEN u2.nombre
                             ELSE u1.nombre
                         END as otro_usuario_nombre
                         FROM mensajes m
                         JOIN usuarios u1 ON m.remitente_id = u1.id
                         JOIN usuarios u2 ON m.destinatario_id = u2.id
                         WHERE m.remitente_id = ? OR m.destinatario_id = ?
                         ORDER BY m.fecha DESC";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $user_id);
                $stmt->bindParam(2, $user_id);
                $stmt->bindParam(3, $user_id);
                $stmt->bindParam(4, $user_id);
                $stmt->execute();
                
                $mensajes = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $mensajes[] = $row;
                }
                
                echo json_encode($mensajes);
                break;
                
            case 'get_conversation':
                // Obtener conversación entre dos usuarios
                $query = "SELECT m.*, 
                         u1.nombre as remitente_nombre, u2.nombre as destinatario_nombre
                         FROM mensajes m
                         JOIN usuarios u1 ON m.remitente_id = u1.id
                         JOIN usuarios u2 ON m.destinatario_id = u2.id
                         WHERE (m.remitente_id = ? AND m.destinatario_id = ?)
                         OR (m.remitente_id = ? AND m.destinatario_id = ?)
                         ORDER BY m.fecha ASC";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user1_id']);
                $stmt->bindParam(2, $_GET['user2_id']);
                $stmt->bindParam(3, $_GET['user2_id']);
                $stmt->bindParam(4, $_GET['user1_id']);
                $stmt->execute();
                
                $mensajes = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $mensajes[] = $row;
                }
                
                echo json_encode($mensajes);
                break;
                
            case 'get_unread':
                // Obtener mensajes no leídos
                $query = "SELECT COUNT(*) as total 
                         FROM mensajes 
                         WHERE destinatario_id = ? AND leido = 0";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($result);
                break;
                
            case 'get_all':
                // Obtener todos los mensajes
                $query = "SELECT m.*, 
                         u1.nombre as remitente_nombre, u2.nombre as destinatario_nombre
                         FROM mensajes m
                         JOIN usuarios u1 ON m.remitente_id = u1.id
                         JOIN usuarios u2 ON m.destinatario_id = u2.id
                         ORDER BY m.fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $mensajes = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $mensajes[] = $row;
                }
                
                echo json_encode($mensajes);
                break;
        }
    } else {
        // Por defecto, devolver todos los mensajes
        $query = "SELECT * FROM mensajes ORDER BY fecha DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $mensajes = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $mensajes[] = $row;
        }
        
        echo json_encode($mensajes);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'send':
                // Enviar mensaje
                $query = "INSERT INTO mensajes 
                         (remitente_id, destinatario_id, texto, fecha) 
                         VALUES 
                         (?, ?, ?, NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->remitente_id);
                $stmt->bindParam(2, $data->destinatario_id);
                $stmt->bindParam(3, $data->texto);
                
                if ($stmt->execute()) {
                    $mensaje_id = $db->lastInsertId();
                    
                    // Obtener el mensaje creado
                    $query_mensaje = "SELECT m.*, 
                                     u1.nombre as remitente_nombre, u2.nombre as destinatario_nombre
                                     FROM mensajes m
                                     JOIN usuarios u1 ON m.remitente_id = u1.id
                                     JOIN usuarios u2 ON m.destinatario_id = u2.id
                                     WHERE m.id = ?";
                    $stmt_mensaje = $db->prepare($query_mensaje);
                    $stmt_mensaje->bindParam(1, $mensaje_id);
                    $stmt_mensaje->execute();
                    $mensaje = $stmt_mensaje->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Mensaje enviado",
                        "mensaje" => $mensaje
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al enviar mensaje"
                    ]);
                }
                break;
                
            case 'mark_read':
                // Marcar mensajes como leídos
                $query = "UPDATE mensajes SET leido = 1 
                         WHERE destinatario_id = ? AND remitente_id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->destinatario_id);
                $stmt->bindParam(2, $data->remitente_id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Mensajes marcados como leídos"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al marcar mensajes"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples mensajes
                if (isset($data->mensajes) && is_array($data->mensajes)) {
                    foreach ($data->mensajes as $mensaje) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM mensajes WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $mensaje->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE mensajes SET 
                                           remitente_id = ?, destinatario_id = ?, texto = ?,
                                           fecha = ?, leido = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $mensaje->remitente_id, $mensaje->destinatario_id,
                                $mensaje->texto, $mensaje->fecha, $mensaje->leido,
                                $mensaje->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO mensajes 
                                           (id, remitente_id, destinatario_id, texto, fecha, leido) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $mensaje->id, $mensaje->remitente_id, $mensaje->destinatario_id,
                                $mensaje->texto, $mensaje->fecha, $mensaje->leido
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Mensajes sincronizados"]);
                }
                break;
        }
    }
}
?>