<?php
require_once '../config/database.php';

// AGREGAR para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$database = new Database();
$db = $database->getConnection();

// CAPTURAR TODOS LOS MÉTODOS DE ENTRADA
$raw_input = file_get_contents("php://input");
error_log("Raw input recibido: " . $raw_input);

// Determinar acción
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Para POST, la acción puede venir en JSON o en $_POST
    if (!empty($raw_input)) {
        $data = json_decode($raw_input);
        $action = $data->action ?? ($_POST['action'] ?? '');
    } else {
        $action = $_POST['action'] ?? '';
    }
} else {
    $action = $_GET['action'] ?? '';
}

error_log("Acción determinada: " . $action);

switch($action) {
    case 'login':
        // Obtener datos
        $email = '';
        $password = '';
        
        if (!empty($raw_input)) {
            $data = json_decode($raw_input);
            if ($data) {
                $email = $data->email ?? '';
                $password = $data->password ?? '';
            }
        }
        
        // Si no vinieron en JSON, buscar en $_POST
        if (empty($email) && isset($_POST['email'])) {
            $email = $_POST['email'];
            $password = $_POST['password'] ?? '';
        }
        
        error_log("Login intentado para email: " . $email);
        
        if (empty($email) || empty($password)) {
            echo json_encode([
                "success" => false,
                "message" => "Email y contraseña requeridos"
            ]);
            break;
        }
        
        // Buscar usuario por email
        $query = "SELECT * FROM usuarios WHERE email = ?";
        $stmt = $db->prepare($query);
        $stmt->execute([$email]);
        
        if ($stmt->rowCount() > 0) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // **IMPORTANTE**: ¿Cómo están almacenadas las contraseñas?
            // Si están en texto plano (poco seguro):
            if ($password === $user['password']) {
                // Remover contraseña del objeto de respuesta por seguridad
                unset($user['password']);
                
                echo json_encode([
                    "success" => true,
                    "user" => $user
                ]);
            } 
            // Si usas password_hash() (recomendado):
            // else if (password_verify($password, $user['password'])) {
            //     unset($user['password']);
            //     echo json_encode([
            //         "success" => true,
            //         "user" => $user
            //     ]);
            // }
            else {
                echo json_encode([
                    "success" => false, 
                    "message" => "Contraseña incorrecta"
                ]);
            }
        } else {
            echo json_encode([
                "success" => false, 
                "message" => "Usuario no encontrado"
            ]);
        }
        break;
        
    case 'getAll':
        try {
            $stmt = $db->query("SELECT id, nombre, email, rol, telefono FROM usuarios");
            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "count" => count($usuarios),
                "data" => $usuarios
            ]);
            
        } catch(Exception $e) {
            error_log("Error en auth.php: " . $e->getMessage());
            echo json_encode([
                "success" => false,
                "message" => "Error en servidor"
            ]);
        }
        break;
        
    case 'check':
        echo json_encode([
            "success" => true,
            "message" => "API Auth funcionando"
        ]);
        break;
        
    default:
        echo json_encode([
            "success" => false,
            "message" => "Acción no válida. Use: getAll, check, login",
            "available_actions" => ["getAll", "check", "login"]
        ]);
        break;
}
?>