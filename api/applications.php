<?php
// sistema_voluntariado/api/applications.php

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
            case 'get_all':
                // Obtener todas las postulaciones
                $query = "SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email,
                         c.titulo as campania_titulo, c.organizacion_nombre
                         FROM postulaciones p
                         JOIN usuarios u ON p.usuario_id = u.id
                         JOIN campanias c ON p.campania_id = c.id
                         ORDER BY p.fecha_postulacion DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $postulaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $postulaciones[] = $row;
                }
                
                echo json_encode($postulaciones);
                break;
                
            case 'get_by_user':
                // Obtener postulaciones de un usuario
                $query = "SELECT p.*, c.titulo, c.organizacion_nombre, c.fecha, c.ubicacion
                         FROM postulaciones p
                         JOIN campanias c ON p.campania_id = c.id
                         WHERE p.usuario_id = ?
                         ORDER BY p.fecha_postulacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $postulaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $postulaciones[] = $row;
                }
                
                echo json_encode($postulaciones);
                break;
                
            case 'get_by_campaign':
                // Obtener postulaciones de una campaña
                $query = "SELECT p.*, u.nombre as usuario_nombre, u.email, u.telefono
                         FROM postulaciones p
                         JOIN usuarios u ON p.usuario_id = u.id
                         WHERE p.campania_id = ?
                         ORDER BY p.fecha_postulacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['campaign_id']);
                $stmt->execute();
                
                $postulaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $postulaciones[] = $row;
                }
                
                echo json_encode($postulaciones);
                break;
                
            case 'get_by_coordinator':
                // Obtener postulaciones para campañas de un coordinador
                $query = "SELECT p.*, u.nombre as usuario_nombre, u.email, u.telefono,
                         c.titulo as campania_titulo, c.organizacion_nombre
                         FROM postulaciones p
                         JOIN usuarios u ON p.usuario_id = u.id
                         JOIN campanias c ON p.campania_id = c.id
                         WHERE c.coordinador_id = ?
                         ORDER BY p.fecha_postulacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['coordinator_id']);
                $stmt->execute();
                
                $postulaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $postulaciones[] = $row;
                }
                
                echo json_encode($postulaciones);
                break;
                
            case 'get_by_organization':
                // Obtener postulaciones para campañas de una organización
                $query = "SELECT p.*, u.nombre as usuario_nombre, u.email, u.telefono,
                         c.titulo as campania_titulo
                         FROM postulaciones p
                         JOIN usuarios u ON p.usuario_id = u.id
                         JOIN campanias c ON p.campania_id = c.id
                         WHERE c.organizacion_id = ?
                         ORDER BY p.fecha_postulacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['organization_id']);
                $stmt->execute();
                
                $postulaciones = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $postulaciones[] = $row;
                }
                
                echo json_encode($postulaciones);
                break;
        }
    } else {
        // Por defecto, devolver todas las postulaciones
        $query = "SELECT * FROM postulaciones ORDER BY fecha_postulacion DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $postulaciones = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $postulaciones[] = $row;
        }
        
        echo json_encode($postulaciones);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'apply':
                // Aplicar a una campaña
                // Verificar si ya está postulado
                $check_query = "SELECT id FROM postulaciones 
                               WHERE usuario_id = ? AND campania_id = ?";
                $check_stmt = $db->prepare($check_query);
                $check_stmt->bindParam(1, $data->usuario_id);
                $check_stmt->bindParam(2, $data->campania_id);
                $check_stmt->execute();
                
                if ($check_stmt->rowCount() > 0) {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Ya estás postulado a esta campaña"
                    ]);
                    break;
                }
                
                // Verificar cupo disponible
                $cupo_query = "SELECT voluntarios_actuales, max_voluntarios 
                              FROM campanias 
                              WHERE id = ?";
                $cupo_stmt = $db->prepare($cupo_query);
                $cupo_stmt->bindParam(1, $data->campania_id);
                $cupo_stmt->execute();
                $campania = $cupo_stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($campania['voluntarios_actuales'] >= $campania['max_voluntarios']) {
                    echo json_encode([
                        "success" => false, 
                        "message" => "No hay cupo disponible en esta campaña"
                    ]);
                    break;
                }
                
                // Insertar postulación
                $query = "INSERT INTO postulaciones 
                         (usuario_id, campania_id, estado, fecha_postulacion) 
                         VALUES 
                         (?, ?, 'pendiente', NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->usuario_id);
                $stmt->bindParam(2, $data->campania_id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Postulación enviada correctamente"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al enviar postulación"
                    ]);
                }
                break;
                
            case 'approve':
                // Aprobar postulación
                $query = "UPDATE postulaciones SET estado = 'aprobado' WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    // Incrementar contador de voluntarios en la campaña
                    $update_campania = "UPDATE campanias 
                                       SET voluntarios_actuales = voluntarios_actuales + 1 
                                       WHERE id = (SELECT campania_id FROM postulaciones WHERE id = ?)";
                    $stmt_campania = $db->prepare($update_campania);
                    $stmt_campania->bindParam(1, $data->id);
                    $stmt_campania->execute();
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Postulación aprobada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al aprobar postulación"
                    ]);
                }
                break;
                
            case 'reject':
                // Rechazar postulación
                $query = "UPDATE postulaciones SET estado = 'rechazado' WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Postulación rechazada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al rechazar postulación"
                    ]);
                }
                break;
                
            case 'cancel':
                // Cancelar postulación
                $query = "DELETE FROM postulaciones WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Postulación cancelada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al cancelar postulación"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples postulaciones
                if (isset($data->postulaciones) && is_array($data->postulaciones)) {
                    foreach ($data->postulaciones as $postulacion) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM postulaciones WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $postulacion->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE postulaciones SET 
                                           usuario_id = ?, campania_id = ?, 
                                           estado = ?, fecha_postulacion = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $postulacion->usuario_id, $postulacion->campania_id,
                                $postulacion->estado, $postulacion->fecha_postulacion,
                                $postulacion->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO postulaciones 
                                           (id, usuario_id, campania_id, estado, fecha_postulacion) 
                                           VALUES 
                                           (?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $postulacion->id, $postulacion->usuario_id, 
                                $postulacion->campania_id, $postulacion->estado,
                                $postulacion->fecha_postulacion
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Postulaciones sincronizadas"]);
                }
                break;
        }
    }
}
?>