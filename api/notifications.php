<?php
// sistema_voluntariado/api/notifications.php

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
                // Obtener notificaciones de un usuario
                $query = "SELECT * FROM notificaciones 
                         WHERE usuario_id = ? 
                         ORDER BY fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $notificaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $notificaciones[] = $row;
                }
                
                echo json_encode($notificaciones);
                break;
                
            case 'get_unread':
                // Obtener notificaciones no leídas
                $query = "SELECT * FROM notificaciones 
                         WHERE usuario_id = ? AND leida = 0 
                         ORDER BY fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $notificaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $notificaciones[] = $row;
                }
                
                echo json_encode($notificaciones);
                break;
                
            case 'get_all':
                // Obtener todas las notificaciones
                $query = "SELECT n.*, u.nombre as usuario_nombre 
                         FROM notificaciones n
                         JOIN usuarios u ON n.usuario_id = u.id
                         ORDER BY n.fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $notificaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $notificaciones[] = $row;
                }
                
                echo json_encode($notificaciones);
                break;
        }
    } else {
        // Por defecto, devolver todas las notificaciones
        $query = "SELECT * FROM notificaciones ORDER BY fecha DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $notificaciones = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $notificaciones[] = $row;
        }
        
        echo json_encode($notificaciones);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'create':
                // Crear nueva notificación
                // Primero verificar si el usuario quiere notificaciones
                $check_query = "SELECT notificaciones FROM usuarios WHERE id = ?";
                $check_stmt = $db->prepare($check_query);
                $check_stmt->bindParam(1, $data->usuario_id);
                $check_stmt->execute();
                $user = $check_stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user && $user['notificaciones'] == 1) {
                    $query = "INSERT INTO notificaciones 
                             (usuario_id, titulo, mensaje, fecha) 
                             VALUES 
                             (?, ?, ?, NOW())";
                    
                    $stmt = $db->prepare($query);
                    $stmt->bindParam(1, $data->usuario_id);
                    $stmt->bindParam(2, $data->titulo);
                    $stmt->bindParam(3, $data->mensaje);
                    
                    if ($stmt->execute()) {
                        echo json_encode([
                            "success" => true,
                            "message" => "Notificación creada"
                        ]);
                    } else {
                        echo json_encode([
                            "success" => false,
                            "message" => "Error al crear notificación"
                        ]);
                    }
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Usuario no acepta notificaciones"
                    ]);
                }
                break;
                
            case 'mark_read':
                // Marcar notificación como leída
                $query = "UPDATE notificaciones SET leida = 1 WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Notificación marcada como leída"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al marcar notificación"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples notificaciones
                if (isset($data->notificaciones) && is_array($data->notificaciones)) {
                    foreach ($data->notificaciones as $notificacion) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM notificaciones WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $notificacion->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE notificaciones SET 
                                           usuario_id = ?, titulo = ?, mensaje = ?,
                                           fecha = ?, leida = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $notificacion->usuario_id, $notificacion->titulo,
                                $notificacion->mensaje, $notificacion->fecha,
                                $notificacion->leida, $notificacion->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO notificaciones 
                                           (id, usuario_id, titulo, mensaje, fecha, leida) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $notificacion->id, $notificacion->usuario_id,
                                $notificacion->titulo, $notificacion->mensaje,
                                $notificacion->fecha, $notificacion->leida
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Notificaciones sincronizadas"]);
                }
                break;
        }
    }
}
?>