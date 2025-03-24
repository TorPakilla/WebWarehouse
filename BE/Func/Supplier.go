package Func

import (
	"Api/Models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func AddSupplier(db *gorm.DB, c *fiber.Ctx) error {
	type SupplierRequest struct {
		Name        string  `json:"name"`
		PricePallet float64 `json:"pricepallet"`
		ProductID   string  `json:"productid"`
	}

	var req SupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON format: " + err.Error(),
		})
	}

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

	if req.ProductID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "productid is required",
		})
	}

	parsedUUID, err := uuid.Parse(req.ProductID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid productid format",
		})
	}

	supplierUUID := uuid.New()
	supplier := Models.Supplier{
		SupplierID:  supplierUUID.String(),
		Name:        req.Name,
		PricePallet: req.PricePallet,

		ProductID: parsedUUID.String(),
	}
	if err := db.Create(&supplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create supplier: " + err.Error(),
		})
	}

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

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Supplier + ProductSupplier created successfully",
		"data": fiber.Map{
			"supplier_id": supplier.SupplierID,
			"product_id":  ps.ProductID,
			"pricepallet": supplier.PricePallet,
		},
	})
}

func AddProductToSupplier(db *gorm.DB, c *fiber.Ctx) error {

	supplierId := c.Params("supplierId")

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

	productSupplier := Models.ProductSupplier{
		ID:          uuid.New().String(),
		SupplierID:  supplierId,
		ProductID:   payload.ProductID,
		PricePallet: payload.Price,
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

	body := make(map[string]interface{})
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format: " + err.Error()})
	}

	allowedFields := map[string]bool{
		"name":        true,
		"pricepallet": true,
		"productid":   true,
	}

	for key := range body {
		if !allowedFields[key] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid field: " + key})
		}
	}

	var req SupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON format: " + err.Error()})
	}

	if req.Name != "" {
		supplier.Name = req.Name
	}
	if req.PricePallet > 0 {
		supplier.PricePallet = req.PricePallet
	}
	if req.ProductID != "" {
		supplier.ProductID = req.ProductID
	}

	if err := db.Save(&supplier).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update supplier: " + err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Supplier updated successfully", "data": supplier})
}

func UpdateProductInSupplier(db *gorm.DB, c *fiber.Ctx) error {
	supplierId := c.Params("supplierId")
	psId := c.Params("psId")

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

	var ps Models.ProductSupplier
	if err := db.Where("id = ? AND supplier_id = ?", psId, supplierId).First(&ps).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "ProductSupplier not found",
		})
	}

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
