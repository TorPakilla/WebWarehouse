package Authentication

import (
	"Api/Models"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var JwtKey = []byte(os.Getenv("JWT_SECRET"))

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// ฟังก์ชันสำหรับ Login
func Login(c *fiber.Ctx) error {

	var data LoginRequest
	if err := c.BodyParser(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid JSON"})
	}

	if data.Username == "" || data.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Username and Password are required"})
	}

	db := c.Locals("db").(*gorm.DB)

	var employee Models.Employees
	if err := db.Where("username = ?", data.Username).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "User not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(employee.Password), []byte(data.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Invalid Password",
			"debug": fiber.Map{
				"stored_hash":      employee.Password,
				"entered_password": data.Password,
			},
		})
	}

	expirationTime := time.Now().Add(30 * time.Minute)
	claims := jwt.MapClaims{
		"role":     employee.Role,
		"username": employee.Username,
		"exp":      expirationTime.Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JwtKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal Server Error"})
	}

	return c.JSON(fiber.Map{
		"token": tokenString,
		"user": fiber.Map{
			"employees_id": employee.EmployeesID,
			"username":     employee.Username,
			"name":         employee.Name,
			"role":         employee.Role,
			"branch": fiber.Map{
				"branch_id": employee.BranchID,
				"b_name":    employee.Branch.BName,
			},
		},
	})

}

// Middleware สำหรับตรวจสอบ Token
func AuthMiddleware(c *fiber.Ctx) error {

	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Invalid Token Format"})
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims := jwt.MapClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return JwtKey, nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	exp, ok := claims["exp"].(float64)
	if !ok || time.Unix(int64(exp), 0).Before(time.Now()) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Token expired"})
	}

	role, ok := claims["role"].(string)
	if !ok || !isValidRole(role) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Permission Denied"})
	}

	c.Locals("username", claims["username"])
	c.Locals("role", claims["role"])

	return c.Next()
}

// ฟังก์ชันตรวจสอบ Role
func isValidRole(role string) bool {
	validRoles := map[string]bool{
		"Stock":   true,
		"Account": true,
		"Manager": true,
		"Audit":   true,
		"God":     true,
	}
	return validRoles[role]
}
