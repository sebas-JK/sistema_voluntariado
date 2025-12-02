<?php
// sistema_voluntariado/api/achievements.php

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
                // Obtener todos los logros
                $query = "SELECT l.*, u.nombre as usuario_nombre 
                         FROM logros l
                         JOIN usuarios u ON l.usuario_id = u.id
                         ORDER BY l.fecha_otorgamiento DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $logros = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $logros[] = $row;
                }
                
                echo json_encode($logros);
                break;
                
            case 'get_by_user':
                // Obtener logros de un usuario
                $query = "SELECT * FROM logros 
                         WHERE usuario_id = ? 
                         ORDER BY fecha_otorgamiento DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->execute();
                
                $logros = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $logros[] = $row;
                }
                
                echo json_encode($logros);
                break;
                
            case 'get_predefined':
                // Obtener logros predefinidos
                $query = "SELECT * FROM logros_predefinidos ORDER BY id";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $logros = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $logros[] = $row;
                }
                
                echo json_encode($logros);
                break;
                
            case 'check_hours_achievement':
                // Verificar logros por horas
                $user_id = $_GET['user_id'];
                
                // Obtener horas totales del usuario
                $query_horas = "SELECT SUM(horas_trabajadas) as total_horas 
                               FROM tareas 
                               WHERE usuario_id = ? AND estado = 'verificada'";
                $stmt_horas = $db->prepare($query_horas);
                $stmt_horas->bindParam(1, $user_id);
                $stmt_horas->execute();
                $horas_data = $stmt_horas->fetch(PDO::FETCH_ASSOC);
                $horas_totales = $horas_data['total_horas'] ?? 0;
                
                // Verificar logro de 50 horas
                if ($horas_totales >= 50) {
                    $check_50 = "SELECT id FROM logros 
                                WHERE usuario_id = ? AND logro_id = 4";
                    $stmt_50 = $db->prepare($check_50);
                    $stmt_50->bindParam(1, $user_id);
                    $stmt_50->execute();
                    
                    if ($stmt_50->rowCount() == 0) {
                        // Otorgar logro de 50 horas
                        $logro_50 = "SELECT * FROM logros_predefinidos WHERE id = 4";
                        $stmt_logro_50 = $db->prepare($logro_50);
                        $stmt_logro_50->execute();
                        $logro_data = $stmt_logro_50->fetch(PDO::FETCH_ASSOC);
                        
                        if ($logro_data) {
                            $insert_50 = "INSERT INTO logros 
                                         (usuario_id, logro_id, nombre, insignia, tipo, otorgado_por, fecha_otorgamiento) 
                                         VALUES 
                                         (?, 4, ?, ?, 'automatico', 'sistema', NOW())";
                            $stmt_insert_50 = $db->prepare($insert_50);
                            $stmt_insert_50->bindParam(1, $user_id);
                            $stmt_insert_50->bindParam(2, $logro_data['nombre']);
                            $stmt_insert_50->bindParam(3, $logro_data['insignia']);
                            $stmt_insert_50->execute();
                        }
                    }
                }
                
                // Verificar logro de 100 horas
                if ($horas_totales >= 100) {
                    $check_100 = "SELECT id FROM logros 
                                 WHERE usuario_id = ? AND logro_id = 5";
                    $stmt_100 = $db->prepare($check_100);
                    $stmt_100->bindParam(1, $user_id);
                    $stmt_100->execute();
                    
                    if ($stmt_100->rowCount() == 0) {
                        // Otorgar logro de 100 horas
                        $logro_100 = "SELECT * FROM logros_predefinidos WHERE id = 5";
                        $stmt_logro_100 = $db->prepare($logro_100);
                        $stmt_logro_100->execute();
                        $logro_data = $stmt_logro_100->fetch(PDO::FETCH_ASSOC);
                        
                        if ($logro_data) {
                            $insert_100 = "INSERT INTO logros 
                                          (usuario_id, logro_id, nombre, insignia, tipo, otorgado_por, fecha_otorgamiento) 
                                          VALUES 
                                          (?, 5, ?, ?, 'automatico', 'sistema', NOW())";
                            $stmt_insert_100 = $db->prepare($insert_100);
                            $stmt_insert_100->bindParam(1, $user_id);
                            $stmt_insert_100->bindParam(2, $logro_data['nombre']);
                            $stmt_insert_100->bindParam(3, $logro_data['insignia']);
                            $stmt_insert_100->execute();
                        }
                    }
                }
                
                echo json_encode([
                    "success" => true,
                    "horas_totales" => $horas_totales,
                    "message" => "Logros verificados"
                ]);
                break;
        }
    } else {
        // Por defecto, devolver todos los logros
        $query = "SELECT * FROM logros ORDER BY fecha_otorgamiento DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $logros = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $logros[] = $row;
        }
        
        echo json_encode($logros);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'grant':
                // Otorgar logro manualmente
                $query = "INSERT INTO logros 
                         (usuario_id, logro_id, nombre, insignia, tipo, otorgado_por, fecha_otorgamiento) 
                         VALUES 
                         (?, ?, ?, ?, 'manual', ?, NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->usuario_id);
                $stmt->bindParam(2, $data->logro_id);
                $stmt->bindParam(3, $data->nombre);
                $stmt->bindParam(4, $data->insignia);
                $stmt->bindParam(5, $data->otorgado_por);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Logro otorgado exitosamente"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al otorgar logro"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples logros
                if (isset($data->logros) && is_array($data->logros)) {
                    foreach ($data->logros as $logro) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM logros WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $logro->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE logros SET 
                                           usuario_id = ?, logro_id = ?, nombre = ?,
                                           insignia = ?, tipo = ?, fecha_otorgamiento = ?,
                                           otorgado_por = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $logro->usuario_id, $logro->logro_id, $logro->nombre,
                                $logro->insignia, $logro->tipo, $logro->fecha_otorgamiento,
                                $logro->otorgado_por, $logro->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO logros 
                                           (id, usuario_id, logro_id, nombre, insignia,
                                            tipo, fecha_otorgamiento, otorgado_por) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $logro->id, $logro->usuario_id, $logro->logro_id,
                                $logro->nombre, $logro->insignia, $logro->tipo,
                                $logro->fecha_otorgamiento, $logro->otorgado_por
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Logros sincronizados"]);
                }
                break;
        }
    }
}
?>