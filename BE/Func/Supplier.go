package Func

import (
	"Api/Models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ✅ ฟังก์ชันเพิ่ม Supplier พร้อมบันทึกลง ProductSupplier
func AddSupplier(db *gorm.DB, c *fiber.Ctx) error {
	// โครงสร้าง JSON ที่ต้องรับจาก Frontend
	// เช่น {"name":"CP MAMA","pricepallet":123,"productid":"<UUID ของ Product ที่มีอยู่>"}
	type SupplierRequest struct {
		Name        string  `json:"name"`
		PricePallet float64 `json:"pricepallet"`
		ProductID   string  `json:"productid"` // ต้องส่งเสมอ
	}

	var req SupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON format: " + err.Error(),
		})
	}

	// 1) ตรวจสอบความถูกต้องของค่า
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Supplier name is required",
		})
	}
	if req.PricePallet <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Price must be > 0",
		})
	}
	// บังคับให้ต้องมี productid เสมอ
	if req.ProductID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "productid is required",
		})
	}
	// พยายาม parse productid เป็น UUID
	parsedUUID, err := uuid.Parse(req.ProductID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid productid format",
		})
	}

	// 2) สร้าง Supplier
	supplierUUID := uuid.New()
	supplier := Models.Supplier{
		SupplierID:  supplierUUID.String(),
		Name:        req.Name,
		PricePallet: req.PricePallet,
		// จะใส่ productID ลงใน Supplier ด้วยก็ได้ (ถ้าคุณยังใช้ฟิลด์นี้)
		ProductID: parsedUUID.String(),
	}
	if err := db.Create(&supplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create supplier: " + err.Error(),
		})
	}

	// 3) สร้าง ProductSupplier โดยใช้ productid ที่ผู้ใช้ส่งมา
	ps := Models.ProductSupplier{
		ID:          uuid.New().String(),
		SupplierID:  supplier.SupplierID,
		ProductID:   parsedUUID.String(),
		PricePallet: req.PricePallet,
	}
	if err := db.Create(&ps).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to link product with supplier: " + err.Error(),
		})
	}

	// 4) ตอบกลับ
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Supplier + ProductSupplier created successfully",
		"data": fiber.Map{
			"supplier_id": supplier.SupplierID,
			"product_id":  ps.ProductID,
			"pricepallet": supplier.PricePallet,
		},
	})
}

// Supplier.go หรือไฟล์ Router อื่น ๆ ที่คุณกำหนดไว้
func AddProductToSupplier(db *gorm.DB, c *fiber.Ctx) error {
	// ดึง supplierId จาก URL
	supplierId := c.Params("supplierId")

	// struct สำหรับรับ JSON body
	type ProductPayload struct {
		ProductID    string  `json:"product_id"`
		Price        float64 `json:"price"`
		SupplierName string  `json:"supplier_name"`
	}

	var payload ProductPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON format: " + err.Error(),
		})
	}

	// ตัวอย่างการบันทึกลงตาราง ProductSupplier (ปรับตามโครงสร้าง DB ของคุณ)
	productSupplier := Models.ProductSupplier{
		ID:          uuid.New().String(), // สร้าง uuid ใหม่
		SupplierID:  supplierId,          // ใช้ค่าจากพารามิเตอร์
		ProductID:   payload.ProductID,
		PricePallet: payload.Price, // สมมติว่าคุณเก็บราคาในฟิลด์ PricePallet
	}

	if err := db.Create(&productSupplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create product for supplier: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Product for supplier created successfully",
		"data":    productSupplier,
	})
}

// ดูข้อมูล Supplier
func LookSuppliers(db *gorm.DB, c *fiber.Ctx) error {
	var suppliers []Models.Supplier
	if err := db.
		Preload("ProductSuppliers").
		Preload("ProductSuppliers.Product").
		Find(&suppliers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(
			fiber.Map{"error": "Failed to fetch suppliers: " + err.Error()})
	}

	return c.JSON(fiber.Map{"data": suppliers})
}

// หาข้อมูล Supplier ตาม ID
func FindSupplier(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var supplier Models.Supplier
	if err := db.Where("supplier_id = ?", id).First(&supplier).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Supplier not found"})
	}
	return c.JSON(fiber.Map{"data": supplier})
}

// อัพเดตข้อมูล Supplier
func UpdateSupplier(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var supplier Models.Supplier
	if err := db.Where("supplier_id = ?", id).First(&supplier).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Supplier not found"})
	}

	type SupplierRequest struct {
		Name        string  `json:"name"`
		PricePallet float64 `json:"pricepallet"`
		ProductID   string  `json:"productid"`
	}

	// อ่าน body มาใส่ใน map เพื่อกรอง field
	body := make(map[string]interface{})
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format: " + err.Error()})
	}

	allowedFields := map[string]bool{
		"name":        true,
		"pricepallet": true,
		"productid":   true,
	}

	// ตรวจสอบว่า body ส่ง field ที่อนุญาตหรือเปล่า
	for key := range body {
		if !allowedFields[key] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid field: " + key})
		}
	}

	var req SupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format: " + err.Error()})
	}

	// อัปเดตฟิลด์ที่ต้องการ
	if req.Name != "" {
		supplier.Name = req.Name
	}
	if req.PricePallet > 0 {
		supplier.PricePallet = req.PricePallet
	}
	if req.ProductID != "" {
		supplier.ProductID = req.ProductID
	}

	// บันทึก
	if err := db.Save(&supplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update supplier: " + err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Supplier updated successfully", "data": supplier})
}

func UpdateProductInSupplier(db *gorm.DB, c *fiber.Ctx) error {
	supplierId := c.Params("supplierId")
	psId := c.Params("psId")

	// Body struct สำหรับรับ JSON ที่จะแก้ไข เช่น แก้ราคา
	type UpdatePayload struct {
		ProductID   string  `json:"product_id"`
		PricePallet float64 `json:"price_pallet"`
	}
	var body UpdatePayload
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON format: " + err.Error(),
		})
	}

	// หา row ใน ProductSupplier
	var ps Models.ProductSupplier
	if err := db.Where("id = ? AND supplier_id = ?", psId, supplierId).First(&ps).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "ProductSupplier not found",
		})
	}

	// แก้ไขค่า
	if body.ProductID != "" {
		ps.ProductID = body.ProductID
	}
	if body.PricePallet > 0 {
		ps.PricePallet = body.PricePallet
	}

	if err := db.Save(&ps).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update product in supplier: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Product in supplier updated successfully",
		"data":    ps,
	})
}

func DeleteProductInSupplier(db *gorm.DB, c *fiber.Ctx) error {
	supplierId := c.Params("supplierId")
	psId := c.Params("psId")

	var ps Models.ProductSupplier
	if err := db.Where("id = ? AND supplier_id = ?", psId, supplierId).First(&ps).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "ProductSupplier not found",
		})
	}

	if err := db.Delete(&ps).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete product in supplier: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Product in supplier deleted successfully",
	})
}

// ลบข้อมูล Supplier ตาม ID
func DeleteSupplier(db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var supplier Models.Supplier
	if err := db.Where("supplier_id = ?", id).First(&supplier).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Supplier not found"})
	}
	if err := db.Delete(&supplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete supplier: " + err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Supplier deleted successfully"})
}

func SupplierRoutes(app *fiber.App, db *gorm.DB) {
	app.Get("/Supplier", func(c *fiber.Ctx) error {
		return LookSuppliers(db, c)
	})

	app.Get("/Supplier/:id", func(c *fiber.Ctx) error {
		return FindSupplier(db, c)
	})

	app.Post("/Supplier", func(c *fiber.Ctx) error {
		return AddSupplier(db, c)
	})

	app.Put("/Supplier/:id", func(c *fiber.Ctx) error {
		return UpdateSupplier(db, c)
	})

	app.Delete("/Supplier/:id", func(c *fiber.Ctx) error {
		return DeleteSupplier(db, c)
	})

	app.Post("/Supplier/:supplierId/products", func(c *fiber.Ctx) error {
		return AddProductToSupplier(db, c)
	})

	app.Put("/Supplier/:supplierId/products/:psId", func(c *fiber.Ctx) error {
		return UpdateProductInSupplier(db, c)
	})

	app.Delete("/Supplier/:supplierId/products/:psId", func(c *fiber.Ctx) error {
		return DeleteProductInSupplier(db, c)
	})

}
