package Func

import (
	"Api/Models"
	"fmt"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// เพื่ม สาขา
func AddBranches(db *gorm.DB, c *fiber.Ctx) error {
	type Request struct {
		BName    string `json:"b_name" validate:"required"`
		Location string `json:"location" validate:"required"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	if req.BName == "" || req.Location == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "BName and Location are required"})
	}

	branch := Models.Branches{
		BName:    req.BName,
		Location: req.Location,
	}

	if err := db.Create(&branch).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create branch"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"new_branch": branch})
}

// อัพเดต สาขา
func UpdateBranches(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch ID is required"})
	}

	fmt.Println("Updating Branch ID:", id) // Debug log
	var branch Models.Branches
	if err := db.Where("branch_id = ?", id).First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Branch not found"})
	}

	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	if err := db.Model(&branch).Updates(body).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update branch"})
	}

	return c.JSON(fiber.Map{"message": "Branch updated successfully", "branch": branch})
}

// ดู สาขา
func LookBranch(db *gorm.DB, c *fiber.Ctx) error {
	var branches []Models.Branches
	if err := db.Find(&branches).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch branches"})
	}
	return c.JSON(fiber.Map{"branches": branches})
}

func getHighestRole(employees []Models.Employees) string {
	roleHierarchy := map[string]int{"God": 1, "Manager": 2, "Audit": 3, "Account": 4, "Stock": 5}
	highestRole := "No Employees"
	highestRank := 999

	for _, emp := range employees {
		if rank, exists := roleHierarchy[emp.Role]; exists {
			if rank < highestRank {
				highestRole = emp.Name
				highestRank = rank
			}
		}
	}
	return highestRole
}

// ดู สาขา แต่ตาม ID
// ดู สาขา ตาม ID
func FindBranches(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var branch Models.Branches

	// 1) ดึงข้อมูล Branch ตัวจริงจากตาราง โดย Preload("Employees") เพื่อให้ได้ slice ของ Employees มาด้วย
	if err := db.Preload("Employees").
		Where("branch_id = ?", id).
		First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Branch not found"})
	}

	// 2) นับจำนวน Categories (ตามตัวอย่างเดิมนับ DISTINCT จากคอลัมน์ quantity ซึ่งอาจไม่ใช่ categories จริง ๆ ก็ได้)
	var totalCategories int64
	if err := db.Model(&Models.Inventory{}).
		Where("branch_id = ?", id).
		Select("COUNT(DISTINCT quantity)").
		Count(&totalCategories).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count categories"})
	}

	// 3) หาผู้จัดการที่มี Role สูงสุด (God > Manager > Audit > Account > Stock)
	manager := "No Employees"
	if len(branch.Employees) > 0 {
		manager = getHighestRole(branch.Employees)
	}

	// 4) สมมุติถ้าอยากนับ Total Items (จำนวนสินค้ารวม) ก็สามารถเพิ่มได้ เช่น:
	var totalItems int64
	if err := db.Model(&Models.Inventory{}).
		Where("branch_id = ?", id).
		Select("SUM(quantity)").
		Scan(&totalItems).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sum items"})
	}

	// 5) ส่งค่ากลับไป
	return c.JSON(fiber.Map{
		"branch": fiber.Map{
			"b_name":      branch.BName,
			"manager":     manager,
			"categories":  totalCategories,
			"total_items": totalItems,      // ถ้าอยากส่งด้วย
			"location":    branch.Location, // หรือข้อมูลอื่น ๆ
			"image_url":   branch.ImageURL,
		},
	})
}

// ลบ สาขา
func DeleteBranches(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var branch Models.Branches
	if err := db.Where("branch_id = ?", id).First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Branch not found"})
	}

	if err := db.Delete(&branch).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete branch: " + err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Branch deleted successfully"})
}

// ดึงข้อมูลสาขาใน Inventory เพื่ออ้างอิงข้อมูลสินค้าในสาขา Warehouse
func GetWarehouseInventory(db *gorm.DB, c *fiber.Ctx) error {
	branchID := c.Query("branchId")
	if branchID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch ID is required"})
	}

	var inventoryItems []Models.Inventory
	if err := db.Where("branch_id = ?", branchID).Find(&inventoryItems).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch inventory items"})
	}

	return c.JSON(fiber.Map{"inventoryItems": inventoryItems})
}

// ดึงข้อมูลสาขาใน Inventory เพื่ออ้างอิงข้อมูลสินค้าในสาขา Pos
func GetPOSInventory(posDB *gorm.DB, c *fiber.Ctx) error {
	branchID := c.Query("branchId")
	if branchID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch ID is required"})
	}

	var inventoryItems []struct {
		InventoryID string `json:"inventory_id"`
		ProductID   string `json:"product_id"` // ใช้ product_id หลังจากการเปลี่ยนชื่อคอลัมน์
		BranchID    string `json:"branch_id"`
		Quantity    int    `json:"quantity"`
		UpdatedAt   string `json:"updated_at"`
	}

	if err := posDB.Table("Inventory").
		Select("inventory_id, product_id, branch_id, quantity, updated_at").
		Where("branch_id = ?", branchID).
		Find(&inventoryItems).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch POS inventory", "details": err.Error()})
	}

	return c.JSON(fiber.Map{"inventoryItems": inventoryItems})
}

// ดึงข้อมูลสาขาของ Pos
func GetPOSBranches(posDB *gorm.DB, c *fiber.Ctx) error {
	var branches []struct {
		BranchID       string `json:"branch_id"`
		BName          string `json:"b_name"`
		Location       string `json:"location"`
		GoogleLocation string `json:"google_location"` // ใช้ชื่อฟิลด์ให้ตรงกับคอลัมน์จริง
		ImageURL       string `json:"image_url"`
	}

	// เพิ่มการ select google_location เข้ามาด้วย
	if err := posDB.Table("Branches").
		Select("branch_id, b_name, location, google_location, image_url").
		Find(&branches).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch POS branches",
			"details": err.Error(),
		})
	}

	if len(branches) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "No POS branches found"})
	}

	return c.JSON(fiber.Map{"branches": branches})
}

// ดึงข้อมูลสาขาของ Warehouse
func GetWarehouseBranches(db *gorm.DB, c *fiber.Ctx) error {
	var branches []struct {
		BranchID string `json:"branch_id"`
		BName    string `json:"b_name"`
		Location string `json:"location"`
	}

	if err := db.Table("Branches").Select("branch_id, b_name, location").Find(&branches).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch Warehouse branches", "details": err.Error()})
	}

	if len(branches) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "No Warehouse branches found"})
	}

	return c.JSON(fiber.Map{"branches": branches})
}

// ✅ ฟังก์ชัน Upload รูปให้ Warehouse Branch
func UploadBranchImage(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch ID is required"})
	}

	var branch Models.Branches
	if err := db.Where("branch_id = ?", id).First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Branch not found"})
	}

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No image file provided"})
	}

	uploadDir := "./uploads/branches"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cannot create upload directory"})
	}

	fileExt := filepath.Ext(file.Filename)
	newFileName := uuid.New().String() + fileExt
	savePath := filepath.Join(uploadDir, newFileName)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}

	// สมมุติว่าโดเมนของคุณ
	imageURL := "http://localhost:5050/uploads/branches/" + newFileName

	branch.ImageURL = imageURL
	if err := db.Save(&branch).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update branch with image URL"})
	}

	return c.JSON(fiber.Map{
		"message":   "Image uploaded successfully",
		"image_url": imageURL,
		"branch":    branch,
	})
}

type PosBranch struct {
	BranchID       string `gorm:"column:branch_id" json:"branch_id"`
	BName          string `gorm:"column:b_name" json:"b_name"`
	Location       string `gorm:"column:location" json:"location"`
	GoogleLocation string `gorm:"column:google_location" json:"google_location"`
	ImageURL       string `gorm:"column:image_url" json:"image_url"` // เพิ่มคอลัมน์ image_url
}

// ⚠️ ต้องไป ALTER TABLE "Branches" ใน POS DB ด้วย ให้มี column image_url (text/varchar)
func UploadPosBranchImage(posDB *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch ID is required"})
	}

	// หา POS Branch จาก posDB
	var branch PosBranch
	if err := posDB.Table("Branches").
		Where("branch_id = ?", id).
		First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "POS Branch not found"})
	}

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No image file provided"})
	}

	uploadDir := "./uploads/pos_branches"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cannot create upload directory"})
	}

	fileExt := filepath.Ext(file.Filename)
	newFileName := uuid.New().String() + fileExt
	savePath := filepath.Join(uploadDir, newFileName)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}

	// สร้าง URL สำหรับรูป (สมมุติ https://example.com)
	imageURL := "http://localhost:5050/uploads/pos_branches/" + newFileName

	// อัปเดตฟิลด์ image_url ของตาราง Branches ใน posDB
	branch.ImageURL = imageURL
	if err := posDB.Table("Branches").
		Where("branch_id = ?", id).
		Updates(map[string]interface{}{"image_url": imageURL}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update POS branch with image URL"})
	}

	return c.JSON(fiber.Map{
		"message":   "Image uploaded successfully (POS)",
		"image_url": imageURL,
		"branch":    branch,
	})
}

// ดึงข้อมูลสาขาของ Pos ตาม ID
func FindPOSBranch(posDB *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var branch PosBranch
	if err := posDB.Table("Branches").
		Where("branch_id = ?", id).
		First(&branch).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "POS Branch not found"})
	}
	return c.JSON(fiber.Map{"branch": branch})
}

func BranchRoutes(app *fiber.App, db *gorm.DB, posDB *gorm.DB) {

	app.Post("/Branches/:id/upload-image", func(c *fiber.Ctx) error {
		return UploadBranchImage(db, c)
	})

	app.Post("/POSBranches/:id/upload-image", func(c *fiber.Ctx) error {
		return UploadPosBranchImage(posDB, c)
	})

	app.Get("/POSBranches/:id", func(c *fiber.Ctx) error {
		return FindPOSBranch(posDB, c)
	})

	app.Get("/WarehouseBranches", func(c *fiber.Ctx) error {
		return GetWarehouseBranches(db, c)
	})

	app.Get("/POSBranches", func(c *fiber.Ctx) error {
		return GetPOSBranches(posDB, c)
	})

	app.Get("/POSInventory", func(c *fiber.Ctx) error {
		return GetPOSInventory(posDB, c)
	})

	app.Get("/WarehouseInventory", func(c *fiber.Ctx) error {
		return GetWarehouseInventory(db, c)
	})

	app.Post("/Branches", func(c *fiber.Ctx) error {
		return AddBranches(db, c)
	})

	app.Get("/Branches", func(c *fiber.Ctx) error {
		return LookBranch(db, c)
	})

	app.Get("/Branches/:id", func(c *fiber.Ctx) error {
		return FindBranches(db, c)
	})

	app.Delete("/Branches/:id", func(c *fiber.Ctx) error {
		return DeleteBranches(db, c)
	})

	app.Put("/Branches/:id", func(c *fiber.Ctx) error {
		return UpdateBranches(db, c)
	})
}
