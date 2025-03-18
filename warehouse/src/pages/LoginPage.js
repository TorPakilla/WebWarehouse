import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GrWorkshop } from "react-icons/gr";
import { login } from "../api/auth";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showAdminMessage, setShowAdminMessage] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const userData = await login({ username, password });

        console.log("Login Response:", userData); // Debugging log

        if (userData.token) {
            localStorage.setItem("token", userData.token);
            localStorage.setItem("user", JSON.stringify(userData.user));

            console.log("Stored User in localStorage:", localStorage.getItem("user")); // Debugging log

            alert("Login successful!");
            navigate("/dashboard"); 
            window.location.reload();
        }
    } catch (error) {
        alert("Login failed! Please check your credentials.");
    }
};




  const handleCreateAccount = () => {
    setShowAdminMessage(true);
    setTimeout(() => setShowAdminMessage(false), 5000);
  };

  const currentDate = new Date().toLocaleString();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url('https://4kwallpapers.com/images/wallpapers/day-trading-8k-5k-6016x3384-13776.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "'Arial', sans-serif",
      }}
    >
      <div
        style={{
          width: "400px",
          padding: "30px",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
          color: "#fff",
        }}
      >
        {/* โลโก้ */}
        <GrWorkshop
          size={60}
          style={{
            color: "#007bff",
            marginBottom: "20px",
          }}
        />
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "20px",
          }}
        >
          Log in with your Black Market WareHouse Account
        </h2>

        {/* ฟอร์ม */}
        <form onSubmit={handleLogin} style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "1rem",
                marginBottom: "5px",
                textAlign: "left",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "1rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "1rem",
                marginBottom: "5px",
                textAlign: "left",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "1rem",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
          >
            Login
          </button>
        </form>

        {/* Create Account */}
        <div style={{ marginTop: "10px" }}>
          <button
            onClick={handleCreateAccount}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            Create Account
          </button>
          {showAdminMessage && (
            <p style={{ color: "#ffcc00", marginTop: "10px" }}>
              กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างบัญชี
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          color: "#fff",
          fontSize: "0.9rem",
        }}
      >
        {currentDate}
      </div>

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          color: "#007bff",
          fontSize: "1.2rem",
          fontWeight: "700",
        }}
      >
        WareHouse
      </div>
    </div>
  );
};

export default LoginPage;
