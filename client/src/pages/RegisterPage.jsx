import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css"; 

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const navigate = useNavigate();

const handleRegister = async (e) => {
  e.preventDefault();
  
  if (email && password && firstName && lastName) {
    /*Send POST request to register API*/
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName
      })
    });
    /*registration success navigate to login page*/
    if (response.ok) {
      navigate("/login");
    /*user already exists show alert*/
    } else if (response.status === 409) {
      alert("มีผู้ใช้นี้เเล้ว");
    }
  } else {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
  }
};

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="logo-container">
          <img src="/logo/logo_full.png" alt="Logo Full" />
        </div>
        <h2>สมัครสมาชิก</h2>
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>อีเมล</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}/>
          </div>
          <div className="input-group">
            <label>รหัสผ่าน</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}/>
          </div>
          <div className="input-group">
            <label>ชื่อ</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
          </div>
          <div className="input-group">
            <label>นามสกุล</label>
            <input type="text"  required value={lastName} onChange={(e) => setLastName(e.target.value)}/>
          </div>
            <button type="submit">สมัครสมาชิก</button>
          </form>
          <p>
            มีบัญชีผู้ใช้? <Link to="/login">เข้าสู่ระบบ</Link>
          </p>
      </div>
    </div>
  );
};

export default RegisterPage;
