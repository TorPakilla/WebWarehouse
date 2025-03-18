import React, { useState, useEffect } from "react";

const BranchForm = ({ onSubmit, selectedBranch, setSelectedBranch }) => {
    const [bname, setBName] = useState("");
    const [location, setLocation] = useState("");

    useEffect(() => {
        if (selectedBranch) {
            setBName(selectedBranch.bname);
            setLocation(selectedBranch.location);
        } else {
            resetForm();
        }
    }, [selectedBranch]);

    const resetForm = () => {
        setBName("");
        setLocation("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = {
            bname,
            location,
        };

        onSubmit(formData, !!selectedBranch);
        resetForm();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Branch Name</label>
                <input
                    type="text"
                    value={bname}
                    onChange={(e) => setBName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Location</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />
            </div>
            <button type="submit">
                {selectedBranch ? "Update Branch" : "Add Branch"}
            </button>
            {selectedBranch && (
                <button type="button" onClick={() => setSelectedBranch(null)}>
                    Cancel
                </button>
            )}
        </form>
    );
};

export default BranchForm;
