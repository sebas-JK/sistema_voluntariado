<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Database {
    private $host = "localhost";
    private $port = "3307";  // ← PUERTO CORRECTO
    private $db_name = "sistema_voluntariado";
    private $username = "root";
    private $password = "";  // Sin contraseña
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // NOTA: Agregar el puerto aquí
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            
            $this->conn = new PDO(
                $dsn,
                $this->username, 
                $this->password
            );
            
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            error_log("✅ MySQL conectado en puerto: {$this->port}");
            
        } catch(PDOException $exception) {
            $errorResponse = [
                "success" => false,
                "message" => "Error de conexión MySQL",
                "error" => $exception->getMessage(),
                "config" => [
                    "host" => $this->host,
                    "port" => $this->port,
                    "db" => $this->db_name,
                    "user" => $this->username
                ]
            ];
            
            error_log("❌ Error MySQL puerto {$this->port}: " . $exception->getMessage());
            
            echo json_encode($errorResponse);
            exit();
        }

        return $this->conn;
    }
}
?>