import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Menu = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);

    useEffect(() => {

        // If sessionStorage have token , set isLoggedIn to true
        if (sessionStorage.getItem("token")) {
            setIsLoggedIn(true);
        }

        //Function for change token
        const handleStorageChange = () => {
            if(sessionStorage.getItem("token")){
                setIsLoggedIn(true);
            }else {
                setIsLoggedIn(false)
            }
        };

        //Add event listener for listen change in sessisonStorage 
        window.addEventListener("storage", handleStorageChange);
        //Remove event listener when the component is unmounted
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);


    const handleLogout = () => {
        setShowLogoutPopup(true);
    };

    const confirmLogout = () => {

        //Remove token.
        sessionStorage.removeItem("token");

        //Set isLoggedIn to false, showLogoutPopup to false 
        //and navigate to Home page.
        setIsLoggedIn(false);
        setShowLogoutPopup(false);
        navigate("/");
    };

    return (
        <nav className="navbar">
            <img src="/logo/logo_full.png" alt="Logo Full" />
            <div className="navbar-links">
                <div className="nav-links">
                    <NavLink to="/">หน้าหลัก</NavLink>
                </div>
                <div className="authen-links">
                    {isLoggedIn ? (
                        <span className="logout-link" onClick={handleLogout}>
                            ออกจากระบบ
                        </span>
                    ) : (
                        <NavLink to="/login">เข้าสู่ระบบ</NavLink>
                    )}
                </div>
            </div>

            {/* Popup Logout */}
            {showLogoutPopup && (
                <div className="popup-overlay">
                    <div className="popup">
                        <p>คุณต้องการออกจากระบบหรือไม่?</p>
                        <button onClick={confirmLogout} className="btn-confirm">ยืนยัน</button>
                        <button onClick={() => setShowLogoutPopup(false)} className="btn-cancel">ยกเลิก</button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Menu;
