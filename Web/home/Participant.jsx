import React, { useState, useEffect, useCallback } from "react";
import Cookies from 'js-cookie';
// import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';
import { useLocation } from 'react-router-dom';
import { url } from '../App.js';
import { FaBars } from 'react-icons/fa';
import { Calendar } from 'react-calendar';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';


export const Participant = () => {
    const location = useLocation();
    const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);
    const [recruitName, setRecruitName] = useState(null);
    const [recruit4D, setRecruit4D] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMenuOptions, setShowMenuOptions] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [recruitData, setRecruitData] = useState(null);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [companyID, setCompanyID] = useState("_________");
    const [userType, setUserType] = useState(1);
    const [admin, setAdmin] = useState(false);
    const isSmallScreen = window.innerWidth <= 768;
    const [date, setDate] = useState(() => {
        const dateSearchParams = new URLSearchParams(location.search);
        const dateString = dateSearchParams.get('date');
        try {
            if (dateString) {
                const decodedDateString = atob(dateString);
                const dateObject = new Date(decodedDateString);
                // Check if the dateObject is a valid date
                if (!isNaN(dateObject.getTime())) {
                    return dateObject;
                }
            }
        } catch (error) {
            return new Date();
        }
        // Return current date if no valid date is found in the search params
        return new Date();
    });
    

    // Authentication   
	useEffect(() => {
		// Authenticate Cookie
		const checkAndRedirect = async () => {
			const { authenticated, redirect } = await checkAuthentication();

			// Verify Cookie Type for page
			if (authenticated === 'Valid: User') {
				setToken(Cookies.get('JWT'));
				setLoading(false); // Set loading to false once authenticated

            } else if (authenticated === 'Valid: Admin' || authenticated === 'Valid: Trainer') {
				setToken(Cookies.get('JWT'));
				setUserType(0);
                const searchParams = new URLSearchParams(location.search);
                setCompanyID(searchParams.get('company'));
				setLoading(false); // Set loading to false once authenticated

                if (authenticated === 'Valid: Admin'){
					setAdmin(true);
				};
				
			} else {
				navigate(redirect);
			}
		};

		checkAndRedirect();
		const authenticationInterval = setInterval(checkAndRedirect, 300 * 1000); // Set up the 5 min interval
		return () => clearInterval(authenticationInterval);

	}, [location.search, navigate, token]);

    // Get Recruits Name
    useEffect(() => {
        setShowLoadingModal(true);

        const fetchName = async () => {
            try {
                if (!recruit4D){
                    const searchParams = new URLSearchParams(location.search);
                    setRecruit4D(searchParams.get('4d'));
                }
    
                // Your API endpoint and data
                const apiUrl = url + '/participant/getInfo';

                let requestData;
                if (userType === 0) {
                    requestData = {
                        recruit4D: recruit4D,
                        companyID: companyID
                    };
                } else {
                    requestData = {
                        recruit4D: recruit4D
                    };
                }
    
                // Make the API call using the fetch API
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                    body: JSON.stringify(requestData),
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setRecruitName(data["message"]["name"]);

                    const dateSearchParams = new URLSearchParams(location.search);
                    dateSearchParams.get('date')
                    

                    // Only call if choosen date is not higher than given date and is within 17 weeks of current date
                    if (new Date().setHours(0, 0, 0, 0) >= date.setHours(0, 0, 0, 0) && date >= new Date(Date.now() - (17 * 7 * 24 * 60 * 60 * 1000))) {
                        // Call fecth data
                        fetchData();
                    } else {
                        setDate(new Date());
                        setShowLoadingModal(false);
                    };
                };

            } catch (error) {
                setShowLoadingModal(false);
            }
        };

        const fetchData = async () => {
            try {
                if (!recruit4D){
                    const searchParams = new URLSearchParams(location.search);
                    setRecruit4D(searchParams.get('4d'));
                }

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;

    
                // Your API endpoint and data
                const apiUrl = url + '/fitbit/all';

                let requestData;
                if (userType === 0){
                    requestData = {
                        recruit4D: recruit4D,
                        date: formattedDate,
                        companyID: companyID
                    };
                } else{
                    requestData = {
                        recruit4D: recruit4D,
                        date: formattedDate
                    };
                };
    
                // Make the API call using the fetch API
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                    body: JSON.stringify(requestData),
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setData(data["message"][0])
                    setShowLoadingModal(false);
                }

            } catch (error) {
                // console.error('Error:', error);
                setShowLoadingModal(false);
            }
        };
        fetchName();
    }, [location.search, token, recruit4D, date, companyID, userType]);

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
        setRecruitData(null);
    }, [date]);


    if (loading) {
		return null;
	};

    // Delete pop-up
    const DeleteModal = ({ message }) => {
        return (
            <div className="error-modal">
                <div className="modal-content">
                    <h2>{message}</h2>
                    <button className={["error-modal-button", "remove-rec"].join(" ")} onClick={() => handleRemoveRecruit("remove")}>Yes</button>
                    <button className="error-modal-button" onClick={() => handleRemoveRecruit("DeleteModal")}>No</button>
                </div>
            </div>
        );
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

    // Remove Recruit from Database
    const handleRemoveRecruit = async (type) => {
        if (type === "DeleteModal"){
            setShowDeleteModal(!showDeleteModal);
        } else {

            try {    
                // Your API endpoint and data
                const apiUrl = url + '/participant/removeParticipant';
                const requestData = {
                    recruit4D: recruit4D
                };
    
                // Make the API call using the fetch API
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                    body: JSON.stringify(requestData),
                });

            } catch (error) {
                console.error('Error:', error);
            }

            setShowDeleteModal(!showDeleteModal);
            navigate("/");
        }
    };

    // Initial Data
    const setData = (object) => {
        let newData = '';

        // Steps & vO2
        newData += `
            <br></br>
            <div id="data-within">
                <div id="data-within-pad"></div>
                <div id="output-data"><b>Steps &emsp; : </b><span class="output-value"> ${object["steps"] ? object["steps"] : "0"} </span></div>
                <div id="data-within-pad"></div>
                <div id="output-data"><b>vO2&emsp;&emsp;: </b><span class="output-value"> ${object["vO2"] ? object["vO2"] : ""} </span></div>
            </div>
        `;
    
        // // Distance & calories
        newData += `
            <div id="data-within">
                <div id="data-within-pad"></div>
                <div id="output-data" class="output-data"><b>Distance: </b><span class="output-value"> ${object["distance"] ? object["distance"] : "0"} km </span></div>
                <div id="data-within-pad"></div>
                <div id="output-data"><b>Calories:&ensp;</b><span class="output-value"> ${object["calories"] ? object["calories"] : "0"} kcal </span></div>
                </div>
            </div>
        `;
    
        // Sleep Data
        if (object["sleep"]) {
            let sleepData = `
                <div>
                    <br></br>
                    <h3>Sleep Activity</h3>`;
    
            object["sleep"].forEach(data => {
                const startDate = new Date(data.startTime);
                const endDate = new Date(data.endTime);
    
                const startTime = `${('0' + startDate.getHours()).slice(-2)}:${('0' + startDate.getMinutes()).slice(-2)}:${('0' + startDate.getSeconds()).slice(-2)}`;
                const endTime = `${('0' + endDate.getHours()).slice(-2)}:${('0' + endDate.getMinutes()).slice(-2)}:${('0' + endDate.getSeconds()).slice(-2)}`;
    
                sleepData += `<span class="output-value"> ${endDate.toLocaleDateString()}, ${startTime} - ${endTime} <b>(${data.durationInBed} hr)</b> </span><br>`;
            });
    
            sleepData += `</div>`;
            newData += sleepData;
        }
    
        // Physical Activity
        if (object["activity"]) {
            let physicalData = `
                <div>
                    <br></br>
                    <h3>Physical Activity</h3><hr></hr>
                </div>`;
    
            object["activity"].forEach((data, index) => {
                physicalData += `
                    <div>${index === 0 ? "" : "<br></br>"}<b>${data.name}</b> - <span class="output-value">${data.time} </span></div>
                    <div id="data-within">
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Steps&emsp;&ensp;: </b><span class="output-value"> ${data.steps ? data.steps : "0"} </span></div>
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Duration: </b><span class="output-value"> ${data.duration > 60 ? (data.duration/60).toFixed(1) + " Hr" : Math.round(data.duration) + " Min"} </span></div>
                    </div>
                    <div id="data-within">
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Distance: </b><span class="output-value"> ${data.distance ? parseFloat(data.distance).toFixed(2) : "0"} km </span></div>
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Pace&emsp;&emsp;: </b><span class="output-value"> ${data.pace ? `${data.pace.split(".")[0]}'${(data.pace.split(".")[1] || "00").padEnd(2, "0")}"` : `0'0"`} </span></div>
                    </div>
                    <div id="data-within">
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Calories : </b><span class="output-value"> ${data.calories ? data.calories : "0"} kcal</div>
                    </div>`;
            });
    
            newData += physicalData;
        }

         // Heart Rate Zone
         if (object["heartRate"]) {
            let heartData = `
                <div>
                    <br></br>
                    <h3>Heart Rate Zone</h3><hr></hr>
                </div>
                <span><b>At Rest: </b><span class="output-value"> ${object["heartRate"]["rest"] ? object["heartRate"]["rest"] + " BPM": "null"}</span></span>`;
    
            object["heartRate"]["zone"].forEach(data => {
                if (data.minutes !== 0 && Math.round(data.caloriesOut) !== 0){
                    heartData += `
                    <div><br></br><b>${data.name === 'Out of Range' ? 'Daily Activity' : data.name}</b></div>
                    <div id="data-within">
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Min:&ensp;</b><span class="output-value"> ${data.min} BPM </span></div>
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Duration: </b><span class="output-value"> ${data.minutes < 60 ? data.minutes + " Min" : (data.minutes/60).toFixed(1) + " Hr"} </span></div>
                    </div>
                    <div id="data-within">
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Max: </b><span class="output-value"> ${data.max} BPM </span></div>
                        <div id="data-within-pad"></div>
                        <div id="output-data"><b>Calories : </b><span class="output-value"> ${Math.round(data.caloriesOut)} kcal </span></div>
                    </div>`;
                }
            });
    
            newData += heartData;
        }
        
        // console.log(newData)
        setRecruitData(newData);
    };

    function RenderRecruitData({ recruitData }) {
        return (
          <div dangerouslySetInnerHTML={{ __html: recruitData }} />
        );
    };

    return (
        <div className="wrapper">
            {showLoadingModal && <LoadingModal/>}

            <div id="row1">
                <div id="pad"></div>
                <div id="title">
                    {isSmallScreen ? <h2>{recruitName} - {recruit4D}</h2> : <h1>{recruitName} - {recruit4D}</h1>}
                </div>
                <div id="button">
                    <button className="remove-rec" onClick={() => handleRemoveRecruit("DeleteModal")}>Remove Recruit</button>
                </div>
                {showDeleteModal && <DeleteModal message={`Remove Recruit - ${recruit4D}`} />}
            </div>

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

            <RenderRecruitData recruitData={recruitData} />

            
            <div style={{ marginBottom: '30px' }}></div>

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
        </div>
    );

};