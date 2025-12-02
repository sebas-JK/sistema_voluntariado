<?php
// sistema_voluntariado/api/campaigns.php

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
            case 'getAll':
            case 'get_all':
                // Obtener todas las campañas con filtro opcional por estado
                $estado = isset($_GET['estado']) ? $_GET['estado'] : '';
                
                if ($estado) {
                    if ($estado == 'activa') {
                        $hoy = date('Y-m-d');
                        $query = "SELECT * FROM campanias 
                                 WHERE estado = 'activa' AND fecha >= ? 
                                 ORDER BY fecha ASC";
                        $stmt = $db->prepare($query);
                        $stmt->bindParam(1, $hoy);
                    } else {
                        $query = "SELECT * FROM campanias 
                                 WHERE estado = ? 
                                 ORDER BY fecha DESC";
                        $stmt = $db->prepare($query);
                        $stmt->bindParam(1, $estado);
                    }
                } else {
                    $query = "SELECT * FROM campanias ORDER BY fecha DESC";
                    $stmt = $db->prepare($query);
                }
                
                $stmt->execute();
                
                $campanias = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $campanias[] = $row;
                }
                
                // Formato que espera el JavaScript
                echo json_encode([
                    "success" => true,
                    "count" => count($campanias),
                    "data" => $campanias
                ]);
                break;
                
            case 'get_active':
                // Obtener campañas activas
                $hoy = date('Y-m-d');
                $query = "SELECT * FROM campanias 
                         WHERE estado = 'activa' AND fecha >= ? 
                         ORDER BY fecha ASC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $hoy);
                $stmt->execute();
                
                $campanias = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $campanias[] = $row;
                }
                
                echo json_encode([
                    "success" => true,
                    "count" => count($campanias),
                    "data" => $campanias
                ]);
                break;
                
            case 'get_by_organization':
                // Obtener campañas de una organización
                if (!isset($_GET['org_id'])) {
                    echo json_encode(["success" => false, "message" => "ID de organización requerido"]);
                    break;
                }
                
                $query = "SELECT * FROM campanias 
                         WHERE organizacion_id = ? 
                         ORDER BY fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['org_id']);
                $stmt->execute();
                
                $campanias = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $campanias[] = $row;
                }
                
                echo json_encode([
                    "success" => true,
                    "count" => count($campanias),
                    "data" => $campanias
                ]);
                break;
                
            case 'get_by_coordinator':
                // Obtener campañas de un coordinador
                if (!isset($_GET['coord_id'])) {
                    echo json_encode(["success" => false, "message" => "ID de coordinador requerido"]);
                    break;
                }
                
                $query = "SELECT * FROM campanias 
                         WHERE coordinador_id = ? 
                         ORDER BY fecha DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['coord_id']);
                $stmt->execute();
                
                $campanias = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $campanias[] = $row;
                }
                
                echo json_encode([
                    "success" => true,
                    "count" => count($campanias),
                    "data" => $campanias
                ]);
                break;
                
            case 'get_by_id':
                // Obtener campaña por ID
                if (!isset($_GET['id'])) {
                    echo json_encode(["success" => false, "message" => "ID de campaña requerido"]);
                    break;
                }
                
                $query = "SELECT * FROM campanias WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['id']);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $campania = $stmt->fetch(PDO::FETCH_ASSOC);
                    echo json_encode([
                        "success" => true,
                        "data" => $campania
                    ]);
                } else {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Campaña no encontrada"
                    ]);
                }
                break;
                
            default:
                echo json_encode([
                    "success" => false, 
                    "message" => "Acción no válida"
                ]);
                break;
        }
    } else {
        // Por defecto, devolver todas las campañas activas
        $hoy = date('Y-m-d');
        $query = "SELECT * FROM campanias 
                 WHERE estado = 'activa' AND fecha >= ? 
                 ORDER BY fecha ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $hoy);
        $stmt->execute();
        
        $campanias = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $campanias[] = $row;
        }
        
        echo json_encode([
            "success" => true,
            "count" => count($campanias),
            "data" => $campanias
        ]);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'create':
                // Crear nueva campaña
                $query = "INSERT INTO campanias 
                         (titulo, descripcion, organizacion_id, organizacion_nombre,
                          coordinador_id, coordinador_nombre, ubicacion, fecha, hora,
                          max_voluntarios, voluntarios_actuales, requisitos, estado, fecha_creacion) 
                         VALUES 
                         (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->titulo);
                $stmt->bindParam(2, $data->descripcion);
                $stmt->bindParam(3, $data->organizacion_id);
                $stmt->bindParam(4, $data->organizacion_nombre);
                $stmt->bindParam(5, $data->coordinador_id);
                $stmt->bindParam(6, $data->coordinador_nombre);
                $stmt->bindParam(7, $data->ubicacion);
                $stmt->bindParam(8, $data->fecha);
                $stmt->bindParam(9, $data->hora);
                $stmt->bindParam(10, $data->max_voluntarios);
                $stmt->bindParam(11, $data->requisitos);
                $estado = $data->estado ?? 'activa';
                $stmt->bindParam(12, $estado);
                
                if ($stmt->execute()) {
                    $campania_id = $db->lastInsertId();
                    
                    // Obtener la campaña creada
                    $query_campania = "SELECT * FROM campanias WHERE id = ?";
                    $stmt_campania = $db->prepare($query_campania);
                    $stmt_campania->bindParam(1, $campania_id);
                    $stmt_campania->execute();
                    $campania = $stmt_campania->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Campaña creada exitosamente",
                        "campania" => $campania
                    ]);
                } else {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Error al crear campaña"
                    ]);
                }
                break;
                
            case 'update':
                // Actualizar campaña
                if (!isset($data->id)) {
                    echo json_encode([
                        "success" => false, 
                        "message" => "ID de campaña requerido"
                    ]);
                    break;
                }
                
                $query = "UPDATE campanias SET 
                         titulo = ?, 
                         descripcion = ?, 
                         ubicacion = ?, 
                         fecha = ?, 
                         hora = ?, 
                         max_voluntarios = ?, 
                         voluntarios_actuales = ?, 
                         requisitos = ?, 
                         estado = ? 
                         WHERE id = ?";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->titulo);
                $stmt->bindParam(2, $data->descripcion);
                $stmt->bindParam(3, $data->ubicacion);
                $stmt->bindParam(4, $data->fecha);
                $stmt->bindParam(5, $data->hora);
                $stmt->bindParam(6, $data->max_voluntarios);
                $stmt->bindParam(7, $data->voluntarios_actuales);
                $stmt->bindParam(8, $data->requisitos);
                $stmt->bindParam(9, $data->estado);
                $stmt->bindParam(10, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true, 
                        "message" => "Campaña actualizada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Error al actualizar"
                    ]);
                }
                break;
                
            case 'delete':
                // Eliminar campaña
                if (!isset($data->id)) {
                    echo json_encode([
                        "success" => false, 
                        "message" => "ID de campaña requerido"
                    ]);
                    break;
                }
                
                $query = "DELETE FROM campanias WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->id);
                
                if ($stmt->execute()) {
                    echo json_encode([
                        "success" => true, 
                        "message" => "Campaña eliminada"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Error al eliminar"
                    ]);
                }
                break;
                
            case 'update_all':
                // Actualizar múltiples campañas (para sincronización)
                if (isset($data->campanias) && is_array($data->campanias)) {
                    $success_count = 0;
                    $error_count = 0;
                    
                    foreach ($data->campanias as $campania) {
                        // Verificar si la campaña ya existe
                        $check_query = "SELECT id FROM campanias WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $campania->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE campanias SET 
                                           titulo = ?, descripcion = ?, organizacion_id = ?,
                                           organizacion_nombre = ?, coordinador_id = ?,
                                           coordinador_nombre = ?, ubicacion = ?, fecha = ?,
                                           hora = ?, max_voluntarios = ?, voluntarios_actuales = ?,
                                           requisitos = ?, estado = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            
                            if ($update_stmt->execute([
                                $campania->titulo, $campania->descripcion, $campania->organizacion_id,
                                $campania->organizacion_nombre, $campania->coordinador_id,
                                $campania->coordinador_nombre, $campania->ubicacion, $campania->fecha,
                                $campania->hora, $campania->max_voluntarios, $campania->voluntarios_actuales,
                                $campania->requisitos, $campania->estado, $campania->id
                            ])) {
                                $success_count++;
                            } else {
                                $error_count++;
                            }
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO campanias 
                                           (id, titulo, descripcion, organizacion_id, organizacion_nombre,
                                            coordinador_id, coordinador_nombre, ubicacion, fecha, hora,
                                            max_voluntarios, voluntarios_actuales, requisitos, estado, fecha_creacion) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
                            $insert_stmt = $db->prepare($insert_query);
                            
                            if ($insert_stmt->execute([
                                $campania->id, $campania->titulo, $campania->descripcion, $campania->organizacion_id,
                                $campania->organizacion_nombre, $campania->coordinador_id, $campania->coordinador_nombre,
                                $campania->ubicacion, $campania->fecha, $campania->hora,
                                $campania->max_voluntarios, $campania->voluntarios_actuales,
                                $campania->requisitos, $campania->estado
                            ])) {
                                $success_count++;
                            } else {
                                $error_count++;
                            }
                        }
                    }
                    echo json_encode([
                        "success" => true, 
                        "message" => "Campañas sincronizadas",
                        "success_count" => $success_count,
                        "error_count" => $error_count
                    ]);
                } else {
                    echo json_encode([
                        "success" => false, 
                        "message" => "Datos de campañas requeridos"
                    ]);
                }
                break;
                
            default:
                echo json_encode([
                    "success" => false, 
                    "message" => "Acción no válida"
                ]);
                break;
        }
    } else {
        echo json_encode([
            "success" => false, 
            "message" => "Acción requerida"
        ]);
    }
} elseif ($method == 'DELETE') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->id)) {
        $query = "DELETE FROM campanias WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $data->id);
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true, 
                "message" => "Campaña eliminada"
            ]);
        } else {
            echo json_encode([
                "success" => false, 
                "message" => "Error al eliminar"
            ]);
        }
    } else {
        echo json_encode([
            "success" => false, 
            "message" => "ID de campaña requerido"
        ]);
    }
} else {
    echo json_encode([
        "success" => false, 
        "message" => "Método no permitido"
    ]);
}
?>