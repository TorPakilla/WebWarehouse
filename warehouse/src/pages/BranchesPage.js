import React, { useState, useEffect } from "react";
import axiosInstance from "../config/axiosInstance";
import "../components/Branches/Branches.css";

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ bname: "", location: "" });
  const [editingBranch, setEditingBranch] = useState(null);

  const fetchBranches = async () => {
    try {
      const response = await axiosInstance.get("/Branches");
      setBranches(response.data.branches || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await axiosInstance.put(`/Branches/${editingBranch.branch_id}`, {
          b_name: formData.bname,
          location: formData.location,
        });
      } else {
        await axiosInstance.post("/Branches", {
          b_name: formData.bname,
          location: formData.location,
        });
      }
      fetchBranches();
      setFormData({ bname: "", location: "" });
      setEditingBranch(null);
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/Branches/${id}`);
      fetchBranches();
    } catch (error) {
      console.error("Error deleting branch:", error);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      bname: branch.b_name,
      location: branch.location,
    });
  };

  const handleCancel = () => {
    setFormData({ bname: "", location: "" });
    setEditingBranch(null);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <div className="branches-page-container">
      <header className="branches-header">
        <h1>Manage Branches</h1>
      </header>

      <div className="branches-content">
        <form onSubmit={handleSubmit} className="branch-form">
          <div className="form-group">
            <label>Branch Name:</label>
            <input
              type="text"
              name="bname"
              value={formData.bname}
              onChange={(e) =>
                setFormData({ ...formData, bname: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingBranch ? "Update Branch" : "Add Branch"}
            </button>
            {editingBranch && (
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="branches-table-container">
          <table className="branches-table">
            <thead>
              <tr>
                <th>Branch ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <tr key={branch.branch_id}>
                    <td>{branch.branch_id}</td>
                    <td>{branch.b_name}</td>
                    <td>{branch.location}</td>
                    <td>
                      <button
                        onClick={() => handleEdit(branch)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(branch.branch_id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No branches available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BranchesPage;
