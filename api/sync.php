<?php
// sistema_voluntariado/api/sync.php
// Para sincronizar cambios específicos

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    $response = ["success" => true, "updates" => []];
    
    if (isset($data->campania_update)) {
        // Actualizar una campaña específica
        $campania = $data->campania_update;
        $query = "UPDATE campanias SET 
                 voluntarios_actuales = ? 
                 WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $campania->voluntarios_actuales);
        $stmt->bindParam(2, $campania->id);
        $stmt->execute();
        $response['updates'][] = "campania_" . $campania->id;
    }
    
    if (isset($data->postulacion_new)) {
        // Nueva postulación
        $postulacion = $data->postulacion_new;
        $query = "INSERT INTO postulaciones 
                 (usuario_id, campania_id, estado, fecha_postulacion) 
                 VALUES 
                 (?, ?, 'pendiente', NOW())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $postulacion->usuario_id);
        $stmt->bindParam(2, $postulacion->campania_id);
        $stmt->execute();
        $response['updates'][] = "postulacion_new";
    }
    
    if (isset($data->postulacion_update)) {
        // Actualizar postulación (aprobada/rechazada)
        $postulacion = $data->postulacion_update;
        $query = "UPDATE postulaciones SET estado = ? WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $postulacion->estado);
        $stmt->bindParam(2, $postulacion->id);
        $stmt->execute();
        
        // Si fue aprobada, incrementar contador de campaña
        if ($postulacion->estado == 'aprobado') {
            $query_campania = "UPDATE campanias 
                              SET voluntarios_actuales = voluntarios_actuales + 1 
                              WHERE id = (SELECT campania_id FROM postulaciones WHERE id = ?)";
            $stmt_campania = $db->prepare($query_campania);
            $stmt_campania->bindParam(1, $postulacion->id);
            $stmt_campania->execute();
        }
        $response['updates'][] = "postulacion_update_" . $postulacion->id;
    }
    
    if (isset($data->mensaje_new)) {
        // Nuevo mensaje
        $mensaje = $data->mensaje_new;
        $query = "INSERT INTO mensajes 
                 (remitente_id, destinatario_id, texto, fecha) 
                 VALUES 
                 (?, ?, ?, NOW())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $mensaje->remitente_id);
        $stmt->bindParam(2, $mensaje->destinatario_id);
        $stmt->bindParam(3, $mensaje->texto);
        $stmt->execute();
        $response['updates'][] = "mensaje_new";
    }
    
    if (isset($data->notificacion_new)) {
        // Nueva notificación
        $notificacion = $data->notificacion_new;
        $query = "INSERT INTO notificaciones 
                 (usuario_id, titulo, mensaje, fecha) 
                 VALUES 
                 (?, ?, ?, NOW())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $notificacion->usuario_id);
        $stmt->bindParam(2, $notificacion->titulo);
        $stmt->bindParam(3, $notificacion->mensaje);
        $stmt->execute();
        $response['updates'][] = "notificacion_new";
    }
    
    if (isset($data->rating_new)) {
        // Nuevo rating
        $rating = $data->rating_new;
        $query = "INSERT INTO ratings 
                 (usuario_id, campania_id, organizacion_id, rating, comentario, fecha_calificacion) 
                 VALUES 
                 (?, ?, ?, ?, ?, NOW())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $rating->usuario_id);
        $stmt->bindParam(2, $rating->campania_id);
        $stmt->bindParam(3, $rating->organizacion_id);
        $stmt->bindParam(4, $rating->rating);
        $stmt->bindParam(5, $rating->comentario);
        $stmt->execute();
        $response['updates'][] = "rating_new";
    }
    
    echo json_encode($response);
}
?>