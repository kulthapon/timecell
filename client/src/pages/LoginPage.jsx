import React, { useState } from "react";  
import { useNavigate, Link } from "react-router-dom"; 
import "../App.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();  

 const handleLogin = async (e) => {
  e.preventDefault();

  if (email && password) {
    /*Send POST request to login API */
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    /*If response is OK parse JSON data*/
    if (response.ok) {
      console.log("helloo");
      const data = await response.json();
      if (data.auth) {
        console.log(data.token);
        /*If authenticated, save token to session storage*/
        sessionStorage.setItem("token", data.token);
        navigate("/");
      }
    /*Unauthorized alert*/
    } else if (response.status === 401) {
      alert("อีเมลหรือรหัสผ่านของคุณไม่ถูกต้อง");
      return;
    }
  } else {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
  }
};

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/logo/logo_full.png" alt="Logo Full" />
        <h2>เข้าสู่ระบบ</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>อีเมล</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>รหัสผ่าน</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit">เข้าสู่ระบบ</button>
        </form>
        <p>
          ยังไม่มีบัญชีผู้ใช้? <Link to="/register">สมัครสมาชิก</Link> 
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
