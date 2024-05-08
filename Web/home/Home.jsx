import React, { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import { FaBars } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';
import { url } from '../App.js';

export const Home = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);
	const [platoon, setPlatoon] = useState(1);
	const [companyID, setCompanyID] = useState("_________");
	const [list4D, setList4D] = useState([]);
	const [showMenuOptions, setShowMenuOptions] = useState(false);
	const [userType, setUserType] = useState(1);
	const [admin, setAdmin] = useState(false);
	const [companyRows, setCompanyRows] = useState([]);

	// Authentication
	useEffect(() => {
		// Authenticate Cookie
		const checkAndRedirect = async () => {
			const { authenticated, redirect } = await checkAuthentication();

			// Verify Cookie Type for page
			if (authenticated === 'Valid: User') {
				setToken(Cookies.get('JWT'));
				setLoading(false); // Set loading to false once authenticated
				setCompanyID(jwtDecode(Cookies.get('JWT'))?.companyID); // Retrieve Company name from JWT

			} else if (authenticated === 'Valid: Admin' || authenticated === 'Valid: Trainer') {
				setToken(Cookies.get('JWT'));
				setUserType(0);
				setLoading(false); // Set loading to false once authenticated

				if (authenticated === 'Valid: Admin'){
					setAdmin(true);
				};

				const response = await fetch(url + '/admin/getCompany', {
					method: 'POST',
					headers: { 'Authorization': `Bearer ${token}` },
				});
				const data = await response.json();
				if (response.ok) {
					const companyArray = data.message.map(item => item.companyID);
					setCompanyRows(companyArray.filter(item => item !== "All"));
					if (companyID === "_________"){
						setCompanyID(companyArray.filter(item => item !== "All")[0]);
					};
				};

			} else {
				navigate(redirect);
			}
		};

		checkAndRedirect();
		const authenticationInterval = setInterval(checkAndRedirect, 300 * 1000); // Set up the 5 min interval
		return () => clearInterval(authenticationInterval);

	}, [navigate, platoon, token, companyID]);

	// Retrieve Embarked 4D Numbers
	useEffect(() => {
		const getStatus = async () => {

			const apiUrl = url + '/participant/status';

			try {
				// Make the API call using the fetch API
				const data = {
                    companyID: companyID
                };

				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
					body: JSON.stringify(data)
				});
	
				// Check if the response is successful (status code 2xx)
				if (response.ok) {
					const data = await response.json();
					setList4D(data.message);
				}
			} catch (error) {};
		};

		if (!loading){
			getStatus();
		}
		const statusInterval = setInterval(getStatus, 10 * 1000); // Set up the 10s interval
		return () => clearInterval(statusInterval);

	}, [platoon, setList4D, companyID, token, loading]);

	useEffect(() => {
		const isMobile = window.innerWidth <= 600; // Adjust the breakpoint as needed
		if (showMenuOptions && isMobile) {
			document.body.classList.add('menu-open');
		} else {
			document.body.classList.remove('menu-open');
		}
	}, [showMenuOptions]);

	if (loading) {
		return null;
	};

	const renderButtons = (start, end) => {
		const buttons = [];
		for (let i = start; i <= end; i++) {
			if (list4D.includes(parseInt(i, 10))){
				buttons.push(<button className="enNumButton" onClick={() => handleParticipantButton(i)} key={i}>{i}</button>);
			} else {
				buttons.push(<button className="disNumButton" key={i} disabled>{i}</button>);
			};
		}
		return buttons;
	};

	const renderLegend = () => (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			<div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
				<div className="disNumButton" style={{ width: '20px', height: '20px' }}></div>
				<span style={{ marginLeft: '5px', marginRight: '15px' }}>Not Enrolled</span>
				<div className="enNumButton" style={{ width: '20px', height: '20px' }}></div>
				Enrolled
			</div>
		</div>
	);

	const handlePlatoonButtonClick = (platoonNumber) => {
		setPlatoon(platoonNumber);
	};

	const handleParticipantButton = (id) => {
		let redirect = "/participant?4d=" + id;
		if (userType === 0){
			redirect += "&company=" + companyID;
		}
        navigate(redirect);
	}

	// Function to handle drop down box
	const handleCompanyChange = (event) => {
		setCompanyID(event.target.value);
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

	function displayCompany() {
		if (userType){
			return (<h1>{companyID.replace(/\d/g, '')} Company</h1>);
		} else {
			return (
				<div>
					<select id="companySelect" value={companyID} onChange={handleCompanyChange}>
						{companyRows.map((companyID, index) => (
							<option key={index} value={companyID}>{companyID.replace(/\d/g, '')}</option>
						))}
					</select>
					<h1 style={{ display: 'inline-block', marginLeft: '10px' }}>Company</h1>
				</div>
			);
		}
	}
		
	return (
		<div>
			{/* To toggle menu */}
			{showMenuOptions && <div className="overlay" onClick={handleToggleMenu}></div>}
			<div className={showMenuOptions ? "menu-icon active" : "menu-icon"} onClick={handleToggleMenu}>
                <FaBars />
            </div>
			<div className={showMenuOptions ? "menu-options active" : "menu-options"}>
				{admin && (<button className="menu-button" onClick={() => handleToggleMenu("admin")}>Admin Portal</button>)}
				<button className="menu-button" onClick={() => handleToggleMenu("home")}>Home Page</button>
				<button className="menu-button" onClick={() => handleToggleMenu("overview")}>Overview</button>
				<button className="menu-logout-button" onClick={() => handleToggleMenu("logout")}>Logout</button>
				
				{/* Add more options as needed */}
			</div>

			{displayCompany()}
			{platoon && (<h2>Platoon {platoon}</h2>)}
			<div>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(1)}>Platoon 1</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(2)}>Platoon 2</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(3)}>Platoon 3</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(4)}>Platoon 4</button>
				<br/><br/>
				{renderLegend()}
				{platoon && (
					<>
					<h3>Section 1</h3>
					{renderButtons(`${platoon}101`, `${platoon}116`)}<br/>
					<h3>Section 2</h3>
					{renderButtons(`${platoon}201`, `${platoon}216`)}<br/>
					<h3>Section 3</h3>
					{renderButtons(`${platoon}301`, `${platoon}316`)}<br/>
					<h3>Section 4</h3>
					{renderButtons(`${platoon}401`, `${platoon}416`)}<br/>
					</>
				)}
				<div style={{ marginBottom: '30px' }}></div>
			</div>
		</div>
	);
};