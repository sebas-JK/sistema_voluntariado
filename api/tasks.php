<?php
// sistema_voluntariado/api/tasks.php

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
                // Obtener todas las tareas
                $query = "SELECT t.*, u.nombre as usuario_nombre, c.titulo as campania_titulo
                         FROM tareas t
                         JOIN usuarios u ON t.usuario_id = u.id
                         JOIN campanias c ON t.campania_id = c.id
                         ORDER BY t.fecha_asignacion DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $tareas = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tareas[] = $row;
                }
                
                echo json_encode($tareas);
                break;
                
            case 'get_by_user':
                // Obtener tareas de un usuario
                $query = "SELECT t.*, c.titulo as campania_titulo, c.organizacion_nombre
                         FROM tareas t
                         JOIN campanias c ON t.campania_id = c.id
                         WHERE t.usuario_id = ?
                         ORDER BY t.fecha_asignacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $tareas = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tareas[] = $row;
                }
                
                echo json_encode($tareas);
                break;
                
            case 'get_by_campaign':
                // Obtener tareas de una campaña
                $query = "SELECT t.*, u.nombre as usuario_nombre
                         FROM tareas t
                         JOIN usuarios u ON t.usuario_id = u.id
                         WHERE t.campania_id = ?
                         ORDER BY t.fecha_asignacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['campaign_id']);
                $stmt->execute();
                
                $tareas = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tareas[] = $row;
                }
                
                echo json_encode($tareas);
                break;
                
            case 'get_verified':
                // Obtener tareas verificadas de un usuario
                $query = "SELECT * FROM tareas 
                         WHERE usuario_id = ? AND estado = 'verificada'
                         ORDER BY fecha_verificacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $tareas = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $tareas[] = $row;
                }
                
                echo json_encode($tareas);
                break;
        }
    } else {
        // Por defecto, devolver todas las tareas
        $query = "SELECT * FROM tareas ORDER BY fecha_asignacion DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $tareas = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $tareas[] = $row;
        }
        
        echo json_encode($tareas);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'assign':
                // Asignar nueva tarea
                $query = "INSERT INTO tareas 
                         (campania_id, usuario_id, descripcion, estado, fecha_asignacion) 
                         VALUES 
                         (?, ?, ?, 'pendiente', NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->campania_id);
                $stmt->bindParam(2, $data->usuario_id);
                $stmt->bindParam(3, $data->descripcion);
                
                if ($stmt->execute()) {
                    $tarea_id = $db->lastInsertId();
                    
                    // Obtener la tarea creada
                    $query_tarea = "SELECT * FROM tareas WHERE id = ?";
                    $stmt_tarea = $db->prepare($query_tarea);
                    $stmt_tarea->bindParam(1, $tarea_id);
                    $stmt_tarea->execute();
                    $tarea = $stmt_tarea->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Tarea asignada exitosamente",
                        "tarea" => $tarea
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al asignar tarea"
                    ]);
                }
                break;
                
            case 'complete':
                // Marcar tarea como completada
                $query = "UPDATE tareas SET 
                         estado = 'completada', 
                         fecha_completacion = NOW() 
                         WHERE id = ?";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Tarea marcada como completada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al completar tarea"
                    ]);
                }
                break;
                
            case 'verify':
                // Verificar tarea (coordinador)
                $query = "UPDATE tareas SET 
                         estado = 'verificada', 
                         horas_trabajadas = ?, 
                         fecha_verificacion = NOW() 
                         WHERE id = ?";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->horas);
                $stmt->bindParam(2, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Tarea verificada exitosamente"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al verificar tarea"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples tareas
                if (isset($data->tareas) && is_array($data->tareas)) {
                    foreach ($data->tareas as $tarea) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM tareas WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $tarea->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE tareas SET 
                                           campania_id = ?, usuario_id = ?, descripcion = ?,
                                           horas_trabajadas = ?, estado = ?, fecha_asignacion = ?,
                                           fecha_completacion = ?, fecha_verificacion = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $tarea->campania_id, $tarea->usuario_id, $tarea->descripcion,
                                $tarea->horas_trabajadas, $tarea->estado, $tarea->fecha_asignacion,
                                $tarea->fecha_completacion, $tarea->fecha_verificacion,
                                $tarea->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO tareas 
                                           (id, campania_id, usuario_id, descripcion,
                                            horas_trabajadas, estado, fecha_asignacion,
                                            fecha_completacion, fecha_verificacion) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $tarea->id, $tarea->campania_id, $tarea->usuario_id, $tarea->descripcion,
                                $tarea->horas_trabajadas, $tarea->estado, $tarea->fecha_asignacion,
                                $tarea->fecha_completacion, $tarea->fecha_verificacion
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Tareas sincronizadas"]);
                }
                break;
        }
    }
}
?>