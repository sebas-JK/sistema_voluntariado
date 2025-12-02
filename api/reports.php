<?php
// sistema_voluntariado/api/reports.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['action'])) {
        switch($_GET['action']) {
            case 'campaigns_by_organization':
                // Reporte de campañas por organización
                $query = "SELECT 
                         c.organizacion_nombre,
                         COUNT(*) as total_campanias,
                         SUM(c.voluntarios_actuales) as total_voluntarios,
                         AVG(c.voluntarios_actuales) as promedio_voluntarios,
                         MIN(c.fecha) as fecha_inicio,
                         MAX(c.fecha) as fecha_fin
                         FROM campanias c
                         WHERE c.organizacion_id = ?
                         GROUP BY c.organizacion_id, c.organizacion_nombre";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $_GET['organization_id']);
                $stmt->execute();
                
                $reporte = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($reporte);
                break;
                
            case 'user_participation':
                // Reporte de participación de usuario
                $user_id = $_GET['user_id'];
                
                // Obtener estadísticas del usuario
                $query = "SELECT 
                         u.nombre,
                         (SELECT COUNT(*) FROM postulaciones WHERE usuario_id = u.id AND estado = 'aprobado') as campanias_participadas,
                         (SELECT COUNT(*) FROM tareas WHERE usuario_id = u.id AND estado = 'verificada') as tareas_completadas,
                         (SELECT SUM(horas_trabajadas) FROM tareas WHERE usuario_id = u.id AND estado = 'verificada') as horas_totales,
                         (SELECT COUNT(*) FROM logros WHERE usuario_id = u.id) as logros_obtenidos
                         FROM usuarios u
                         WHERE u.id = ?";
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $user_id);
                $stmt->execute();
                
                $reporte = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Obtener campañas participadas
                $query_campanias = "SELECT c.titulo, c.organizacion_nombre, c.fecha, p.estado
                                   FROM postulaciones p
                                   JOIN campanias c ON p.campania_id = c.id
                                   WHERE p.usuario_id = ?
                                   ORDER BY c.fecha DESC";
                $stmt_campanias = $db->prepare($query_campanias);
                $stmt_campanias->bindParam(1, $user_id);
                $stmt_campanias->execute();
                
                $campanias = [];
                while ($row = $stmt_campanias->fetch(PDO::FETCH_ASSOC)) {
                    $campanias[] = $row;
                }
                
                $reporte['campanias'] = $campanias;
                echo json_encode($reporte);
                break;
                
            case 'system_overview':
                // Reporte general del sistema
                $reporte = [];
                
                // Total usuarios por rol
                $query_usuarios = "SELECT rol, COUNT(*) as total 
                                  FROM usuarios 
                                  GROUP BY rol";
                $stmt_usuarios = $db->prepare($query_usuarios);
                $stmt_usuarios->execute();
                
                $usuarios_por_rol = [];
                while ($row = $stmt_usuarios->fetch(PDO::FETCH_ASSOC)) {
                    $usuarios_por_rol[] = $row;
                }
                $reporte['usuarios_por_rol'] = $usuarios_por_rol;
                
                // Total campañas
                $query_campanias = "SELECT 
                                   estado, 
                                   COUNT(*) as total,
                                   SUM(voluntarios_actuales) as total_voluntarios
                                   FROM campanias 
                                   GROUP BY estado";
                $stmt_campanias = $db->prepare($query_campanias);
                $stmt_campanias->execute();
                
                $campanias_por_estado = [];
                while ($row = $stmt_campanias->fetch(PDO::FETCH_ASSOC)) {
                    $campanias_por_estado[] = $row;
                }
                $reporte['campanias_por_estado'] = $campanias_por_estado;
                
                // Total horas de voluntariado
                $query_horas = "SELECT SUM(horas_trabajadas) as total_horas 
                               FROM tareas 
                               WHERE estado = 'verificada'";
                $stmt_horas = $db->prepare($query_horas);
                $stmt_horas->execute();
                $horas = $stmt_horas->fetch(PDO::FETCH_ASSOC);
                $reporte['total_horas_voluntariado'] = $horas['total_horas'] ?? 0;
                
                // Actividad reciente (últimos 30 días)
                $query_actividad = "SELECT 
                                   DATE(fecha_postulacion) as fecha,
                                   COUNT(*) as postulaciones
                                   FROM postulaciones 
                                   WHERE fecha_postulacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                                   GROUP BY DATE(fecha_postulacion)
                                   ORDER BY fecha DESC";
                $stmt_actividad = $db->prepare($query_actividad);
                $stmt_actividad->execute();
                
                $actividad_reciente = [];
                while ($row = $stmt_actividad->fetch(PDO::FETCH_ASSOC)) {
                    $actividad_reciente[] = $row;
                }
                $reporte['actividad_reciente'] = $actividad_reciente;
                
                echo json_encode($reporte);
                break;
                
            case 'organization_ratings':
                // Reporte de calificaciones por organización
                $query = "SELECT 
                         o.nombre as organizacion,
                         AVG(r.rating) as promedio_calificacion,
                         COUNT(r.id) as total_calificaciones,
                         SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) as cinco_estrellas,
                         SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as una_estrella
                         FROM ratings r
                         JOIN usuarios o ON r.organizacion_id = o.id
                         GROUP BY r.organizacion_id, o.nombre
                         ORDER BY promedio_calificacion DESC";
                
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $ratings = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $ratings[] = $row;
                }
                
                echo json_encode($ratings);
                break;
        }
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action) && $data->action == 'generate_csv') {
        // Generar reporte CSV (ejemplo)
        $report_type = $data->report_type;
        $filename = "reporte_" . date('Y-m-d') . ".csv";
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        switch($report_type) {
            case 'users':
                fputcsv($output, ['ID', 'Nombre', 'Email', 'Rol', 'Fecha Registro']);
                
                $query = "SELECT id, nombre, email, rol, fecha_registro FROM usuarios";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    fputcsv($output, $row);
                }
                break;
                
            case 'campaigns':
                fputcsv($output, ['ID', 'Título', 'Organización', 'Fecha', 'Voluntarios', 'Estado']);
                
                $query = "SELECT id, titulo, organizacion_nombre, fecha, voluntarios_actuales, estado 
                         FROM campanias";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    fputcsv($output, $row);
                }
                break;
        }
        
        fclose($output);
    }
}
?>