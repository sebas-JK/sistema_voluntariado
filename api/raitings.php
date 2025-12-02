<?php
// sistema_voluntariado/api/ratings.php

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
                // Obtener todos los ratings
                $query = "SELECT r.*, u.nombre as usuario_nombre, c.titulo as campania_titulo,
                         o.nombre as organizacion_nombre
                         FROM ratings r
                         JOIN usuarios u ON r.usuario_id = u.id
                         JOIN campanias c ON r.campania_id = c.id
                         JOIN usuarios o ON r.organizacion_id = o.id
                         ORDER BY r.fecha_calificacion DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $ratings = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $ratings[] = $row;
                }
                
                echo json_encode($ratings);
                break;
                
            case 'get_by_campaign':
                // Obtener ratings de una campaña
                $query = "SELECT r.*, u.nombre as usuario_nombre
                         FROM ratings r
                         JOIN usuarios u ON r.usuario_id = u.id
                         WHERE r.campania_id = ?
                         ORDER BY r.fecha_calificacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['campaign_id']);
                $stmt->execute();
                
                $ratings = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $ratings[] = $row;
                }
                
                echo json_encode($ratings);
                break;
                
            case 'get_by_organization':
                // Obtener ratings de una organización
                $query = "SELECT r.*, u.nombre as usuario_nombre, c.titulo as campania_titulo
                         FROM ratings r
                         JOIN usuarios u ON r.usuario_id = u.id
                         JOIN campanias c ON r.campania_id = c.id
                         WHERE r.organizacion_id = ?
                         ORDER BY r.fecha_calificacion DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['organization_id']);
                $stmt->execute();
                
                $ratings = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $ratings[] = $row;
                }
                
                echo json_encode($ratings);
                break;
                
            case 'get_average':
                // Obtener promedio de ratings de una organización
                $query = "SELECT AVG(rating) as promedio, COUNT(*) as total
                         FROM ratings 
                         WHERE organizacion_id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['organization_id']);
                $stmt->execute();
                
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($result);
                break;
                
            case 'check_user_rating':
                // Verificar si un usuario ya calificó una campaña
                $query = "SELECT id FROM ratings 
                         WHERE usuario_id = ? AND campania_id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['user_id']);
                $stmt->bindParam(2, $_GET['campaign_id']);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(["rated" => true]);
                } else {
                    echo json_encode(["rated" => false]);
                }
                break;
        }
    } else {
        // Por defecto, devolver todos los ratings
        $query = "SELECT * FROM ratings ORDER BY fecha_calificacion DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $ratings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $ratings[] = $row;
        }
        
        echo json_encode($ratings);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        switch($data->action) {
            case 'rate':
                // Crear nuevo rating
                // Verificar si ya calificó
                $check_query = "SELECT id FROM ratings 
                               WHERE usuario_id = ? AND campania_id = ?";
                $check_stmt = $db->prepare($check_query);
                $check_stmt->bindParam(1, $data->usuario_id);
                $check_stmt->bindParam(2, $data->campania_id);
                $check_stmt->execute();
                
                if ($check_stmt->rowCount() > 0) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Ya calificaste esta campaña"
                    ]);
                    break;
                }
                
                $query = "INSERT INTO ratings 
                         (usuario_id, campania_id, organizacion_id, rating, comentario, fecha_calificacion) 
                         VALUES 
                         (?, ?, ?, ?, ?, NOW())";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $data->usuario_id);
                $stmt->bindParam(2, $data->campania_id);
                $stmt->bindParam(3, $data->organizacion_id);
                $stmt->bindParam(4, $data->rating);
                $stmt->bindParam(5, $data->comentario);
                
                if ($stmt->execute()) {
                    // Actualizar promedio de la organización
                    $update_query = "UPDATE usuarios 
                                    SET rating_promedio = (
                                        SELECT AVG(rating) FROM ratings WHERE organizacion_id = ?
                                    ),
                                    total_calificaciones = (
                                        SELECT COUNT(*) FROM ratings WHERE organizacion_id = ?
                                    )
                                    WHERE id = ?";
                    $update_stmt = $db->prepare($update_query);
                    $update_stmt->bindParam(1, $data->organizacion_id);
                    $update_stmt->bindParam(2, $data->organizacion_id);
                    $update_stmt->bindParam(3, $data->organizacion_id);
                    $update_stmt->execute();
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Calificación registrada exitosamente"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al registrar calificación"
                    ]);
                }
                break;
                
            case 'update_all':
                // Sincronizar múltiples ratings
                if (isset($data->ratings) && is_array($data->ratings)) {
                    foreach ($data->ratings as $rating) {
                        // Verificar si ya existe
                        $check_query = "SELECT id FROM ratings WHERE id = ?";
                        $check_stmt = $db->prepare($check_query);
                        $check_stmt->bindParam(1, $rating->id);
                        $check_stmt->execute();
                        
                        if ($check_stmt->rowCount() > 0) {
                            // Actualizar
                            $update_query = "UPDATE ratings SET 
                                           usuario_id = ?, campania_id = ?, organizacion_id = ?,
                                           rating = ?, comentario = ?, fecha_calificacion = ?
                                           WHERE id = ?";
                            $update_stmt = $db->prepare($update_query);
                            $update_stmt->execute([
                                $rating->usuario_id, $rating->campania_id, $rating->organizacion_id,
                                $rating->rating, $rating->comentario, $rating->fecha_calificacion,
                                $rating->id
                            ]);
                        } else {
                            // Insertar nueva
                            $insert_query = "INSERT INTO ratings 
                                           (id, usuario_id, campania_id, organizacion_id,
                                            rating, comentario, fecha_calificacion) 
                                           VALUES 
                                           (?, ?, ?, ?, ?, ?, ?)";
                            $insert_stmt = $db->prepare($insert_query);
                            $insert_stmt->execute([
                                $rating->id, $rating->usuario_id, $rating->campania_id,
                                $rating->organizacion_id, $rating->rating, $rating->comentario,
                                $rating->fecha_calificacion
                            ]);
                        }
                    }
                    echo json_encode(["success" => true, "message" => "Ratings sincronizados"]);
                }
                break;
        }
    }
}
?>