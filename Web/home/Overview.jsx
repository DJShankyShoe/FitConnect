import React, { useState, useEffect, useCallback } from "react";
import Cookies from 'js-cookie';
import { FaBars } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';
import { Calendar } from 'react-calendar';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { url } from '../App.js';

export const Overview = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);
	const [platoon, setPlatoon] = useState(1);
	const [companyID, setCompanyID] = useState("_________");
	const [listData, setListData] = useState({});
    const [date, setDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
	const [showMenuOptions, setShowMenuOptions] = useState(false);
	const [selectedOption, setSelectedOption] = useState('sleep');
	const [showLoadingModal, setShowLoadingModal] = useState(false);
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

	// Retrieve recruit Data
	useEffect(() => {
		const getSleepData = async () => {

			setShowLoadingModal(true);
			const apiUrl = url + '/fitbit/data';

			try {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;

                // Make the API call using the fetch API
                let requestData = {
                    date: formattedDate,
					type: selectedOption
                };

				if (!userType){
					requestData["companyID"] = companyID;
				};
				
				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
                    body: JSON.stringify(requestData)
				});
	
				// Check if the response is successful (status code 2xx)
				if (response.ok) {
					const data = await response.json();
					setListData(data.message);
					setShowLoadingModal(false);

				} else {
					setShowLoadingModal(false);
				}
			} catch (error) {
				setShowLoadingModal(false);
			};
		};

		if (!loading){

			// Only call if choosen date is not higher than given date and is within 17 weeks of current date
			if (new Date().setHours(0, 0, 0, 0) >= date.setHours(0, 0, 0, 0) && date >= new Date(Date.now() - (17 * 7 * 24 * 60 * 60 * 1000))) {
				getSleepData();
				
			} else {
				setDate(new Date());
			};
			
		};

	}, [date, token, loading, selectedOption, companyID, userType]);

	useEffect(() => {
		const isMobile = window.innerWidth <= 600; // Adjust the breakpoint as needed
		if (showMenuOptions && isMobile) {
			document.body.classList.add('menu-open');
		} else {
			document.body.classList.remove('menu-open');
		}
	}, [showMenuOptions]);

    // Handle date navigation with arrow keys
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'ArrowLeft') {
            const prevDate = new Date(date);
            prevDate.setDate(prevDate.getDate() - 1);
            setDate(prevDate);
        } else if (event.key === 'ArrowRight') {
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            setDate(nextDate);
        }
    }, [date]);

    // Calender
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Calender
    useEffect(() => {
        setShowCalendar(false);
    }, [date]);

	if (loading) {
		return null;
	};

	let handleParticipantButton;
	if (userType === 0) {
		handleParticipantButton = (id) => {
			navigate("/participant?4d=" + id + "&company=" + companyID + "&date=" + btoa(date));
		}
	} else {
		handleParticipantButton = (id) => {
			navigate("/participant?4d=" + id + "&date=" + btoa(date));
		}
	};

	const renderButtons = (start, end) => {
		const buttons = [];
        // Extract 4DNumbers from the 'message' array
        const extract4DNumbers = Array.isArray(listData) ? listData.map(item => parseInt(item['4DNumber'], 10)) : [];
		for (let i = start; i <= end; i++) {
			if (extract4DNumbers.includes(i)){
				let colorCode = "enNumButton";
				let data = "";

				if (selectedOption === 'sleep'){
					data = listData[extract4DNumbers.indexOf(i)]["durationInBed"];
					colorCode = (parseInt(data) < 6.5 ? "warningButton" : "enNumButton");
					data = (data === "Null" ? "null" : data + " hr");

				} else if (selectedOption === 'distance'){
					data = listData[extract4DNumbers.indexOf(i)]["distance"];
					data = (data === "Null" ? "null" : data + " KM");

				} else if (selectedOption === 'calories'){
					data = listData[extract4DNumbers.indexOf(i)]["calories"];
					data = (data === "Null" ? "null" : data + " kcal");

				} else if (selectedOption === 'vO2'){
					data = listData[extract4DNumbers.indexOf(i)]["vO2"];
					data = (data === "Null" ? "null" : data);

				}  else if (selectedOption === 'heartRate'){
					data = listData[extract4DNumbers.indexOf(i)]["heartRate"];
					data = (data === "Null" ? "null" : data + " bpm");
				}

                

				buttons.push(<button className={colorCode} onClick={() => handleParticipantButton(i)} key={i}>{i}<br/><span id="newLineColor"><b>{data}</b></span></button>);
			} else {
				buttons.push(<button className="disNumButton" key={i} disabled>{i}<br/><span id="newLineColor"><b>null</b></span></button>);
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
                <span style={{ marginLeft: '5px', marginRight: '15px' }}>Enrolled</span>
                <div className="warningButton" style={{ width: '20px', height: '20px' }}></div>
                Danger Zone
			</div>
		</div>
	);

	const handlePlatoonButtonClick = (platoonNumber) => {
		setPlatoon(platoonNumber);
	};

	// Function to handle drop down box
	const handleOptionChange = (event) => {
		setSelectedOption(event.target.value);
	};

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

	// show loading page
	const LoadingModal = () => {
		return (
			<div className="error-modal">
				<div className="modal-content">
					<h2>Loading...</h2>
				</div>
			</div>
		);
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
			{showLoadingModal && <LoadingModal/>}

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

			<h4>
				<div id="calender-arrangement">
					<div className="arrow-box">
						<IoIosArrowBack onClick={() => handleKeyDown({ key: 'ArrowLeft' })}/>
					</div>
					<span className="date-span" onClick={() => setShowCalendar(!showCalendar)} >{date.toDateString()}</span>
					<div className="arrow-box">
						<IoIosArrowForward onClick={() => handleKeyDown({ key: 'ArrowRight' })}/>
					</div>
					{showCalendar && (<Calendar onChange={setDate} value={date} />)}
				</div>
			</h4>
            
			<div>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(1)}>Platoon 1</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(2)}>Platoon 2</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(3)}>Platoon 3</button>
				<button className="plButton" onClick={() => handlePlatoonButtonClick(4)}>Platoon 4</button>

				<h3 className="font-blue">Data Type: &nbsp;
					{/* Dropdown select element */}
					<select className="dropdown-select" value={selectedOption} onChange={handleOptionChange}>
						<option value="sleep">Sleep</option>
						<option value="distance">Distance</option>
						<option value="calories">Calories</option>
						<option value="vO2">vO2</option>
						<option value="heartRate">Heart Rate (At Rest)</option>
					</select>
				</h3>

				<br/>

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