import React, { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import { FaBars } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';

export const Admin = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);
	const [showMenuOptions, setShowMenuOptions] = useState(false);

	// Authentication
	useEffect(() => {
		// Authenticate Cookie
		const checkAndRedirect = async () => {
			const { authenticated, redirect } = await checkAuthentication();

			// Verify Cookie Type for page
			if (authenticated === 'Valid: Admin') {
				setToken(Cookies.get('JWT'));
				setLoading(false); // Set loading to false once authenticated

			} else {
				navigate(redirect);
			}
		};

		checkAndRedirect();
		const authenticationInterval = setInterval(checkAndRedirect, 300 * 1000); // Set up the 5 min interval
		return () => clearInterval(authenticationInterval);

	}, [navigate, token]);


	if (loading) {
		return null;
	};

	// Handling Menu Bar
	const handleToggleMenu = (type) => {
		// For logging out
		if (type === "logout"){
			Cookies.remove('JWT');
			navigate('/login');
		} else if (type === "home"){
			navigate('/');
        } else if (type === "admin"){
			navigate('/admin');
		} else if (type === "overview"){
			navigate('/overview');
		}

        // Handle toggling the menu or navigating to a specific menu page
		setShowMenuOptions(!showMenuOptions);
    };


		
	return (
		<div>
			{/* To toggle menu */}
			{showMenuOptions && <div className="overlay" onClick={handleToggleMenu}></div>}
			<div className={showMenuOptions ? "menu-icon active" : "menu-icon"} onClick={handleToggleMenu}>
                <FaBars />
            </div>
			<div className={showMenuOptions ? "menu-options active" : "menu-options"}>
                <button className="menu-button" onClick={() => handleToggleMenu("admin")}>Admin Portal</button>
				<button className="menu-button" onClick={() => handleToggleMenu("home")}>Home Page</button>
				<button className="menu-button" onClick={() => handleToggleMenu("overview")}>Overview</button>
				<button className="menu-logout-button" onClick={() => handleToggleMenu("logout")}>Logout</button>
				{/* Add more options as needed */}
			</div>

			
		</div>
	);
};