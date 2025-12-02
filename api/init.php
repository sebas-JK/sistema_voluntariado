<?php
require_once '../config/database.php';

// Configurar headers primero
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Obtener acción
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    switch($action) {
        case 'ping':
            echo json_encode([
                "success" => true,
                "message" => "✅ API funcionando correctamente",
                "timestamp" => date('Y-m-d H:i:s'),
                "database" => "Conectada"
            ]);
            break;
            
        case 'check_database':
            // Verificar tablas principales
            $tables = ['usuarios', 'campanias', 'postulaciones', 'tareas'];
            $existingTables = [];
            
            foreach($tables as $table) {
                $stmt = $db->query("SHOW TABLES LIKE '$table'");
                if($stmt && $stmt->rowCount() > 0) {
                    $existingTables[] = $table;
                }
            }
            
            echo json_encode([
                "success" => true,
                "message" => "Base de datos verificada",
                "tables_found" => count($existingTables),
                "tables" => $existingTables,
                "total_tables" => $tables
            ]);
            break;
            
        default:
            echo json_encode([
                "success" => true,
                "message" => "API de inicialización lista",
                "endpoints" => [
                    "ping" => "/api/init.php?action=ping",
                    "check_database" => "/api/init.php?action=check_database"
                ]
            ]);
    }
    
} catch(Exception $e) {
    // Error general
    echo json_encode([
        "success" => false,
        "message" => "Error en el servidor",
        "error" => $e->getMessage()
    ]);
    http_response_code(500);
}
?>