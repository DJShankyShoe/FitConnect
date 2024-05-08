import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode'
import { useNavigate, useParams } from 'react-router-dom';
import { checkAuthentication } from '../authenticate';
import { url } from '../App.js';

export const Enrollment = () => {
	const [token, setToken] = useState(null);
	const [participantName, setParticipantName] = useState('');
	const [participantID, setParticipantID] = useState('');
	const [loading, setLoading] = useState(true);
	const [submitLoad1, setSubmitLoad1] = useState(false);
	const [submitLoad2, setSubmitLoad2] = useState(false);
	const [submitLoad3, setSubmitLoad3] = useState(false);
	const [enrollmentError, setEnrollmentError] = useState(null);
    const navigate = useNavigate();
	const { param1 } = useParams();

	useEffect(() => {
		// Authenticate Cookie
		const checkAndRedirect = async () => {
			// eslint-disable-next-line
			const { authenticated, redirect } = await checkAuthentication(param1);

			// Verify Cookie Type for page
			if (authenticated === 'Valid: Enrollment') {
				setToken(param1);
				setLoading(false); // Set loading to false once authenticated
			} else {
				navigate('/error');
			}
		};

		checkAndRedirect();
		const authenticationInterval = setInterval(checkAndRedirect, 300 * 1000); // Set up the interval
		return () => clearInterval(authenticationInterval);
	}, [navigate, param1]);

	useEffect(() =>{
		// Vaidate Name
		const regex1 = /^[a-zA-Z|\s]+$/;
		if (participantName === ''){
			setSubmitLoad1(false);
		} else if (regex1.test(participantName)) {
			setSubmitLoad1(false);
		} else {
			setSubmitLoad1(true);
		}

		// Validate 4D Number
		const regex2 = /^([1-4])([1-4])((0[1-9])|(1[0-6]))$/;
		if (participantID === ''){
			setSubmitLoad2(false);
		} else if (regex2.test(participantID)) {
			setSubmitLoad2(false);
		} else {
			setSubmitLoad2(true);
		}

	}, [participantName, participantID, submitLoad1, submitLoad2]);

	if (loading) {
		return null;
	}

	let company = '';
	try {
		company = jwtDecode(token)?.companyID.replace(/\d/g, '');
	} catch (error) {
		company = "_________";
	}

	const handleSubmit = async (e) => {
        e.preventDefault();

		setEnrollmentError(null);
		setSubmitLoad3(true);

        // Your API endpoint and data
        const apiUrl = url + '/participant/getAuthorizationLink';
        const requestData = {
			participantName: participantName,
            participantID: participantID
        };

        try {
            // Make the API call using the fetch API
            const response = await fetch(apiUrl, {
                method: 'POST',
				headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                body: JSON.stringify(requestData),
            });

            // Check if the response is successful
			const data = await response.json();
            if (data.message === "Participant 4D exist") {
				setEnrollmentError("4D Taken! Approach Superior.");

			} else if (data.message === "4D not valid") {
				setEnrollmentError("4D not valid");

            } else if (data.message === "Participant 4D does not exist") {
				window.location.href = data.link;

            } else {
				// Handle error responses, e.g., display an error message
				setEnrollmentError("An error has occured");
			}
			setSubmitLoad3(false);

        } catch (error) {
            // Handle network or other errors
            setEnrollmentError("An error has occured");
			setSubmitLoad3(false);
        }
    };

	return (
        <div className="auth-form-container">
            <h2>{company} Company</h2>
            <form className="login-form" onSubmit={handleSubmit}>
				<label htmlFor="participantName">Name</label>
				<input value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="Do not state Full Name" type="text" id="participantName" name="participantName" required/>
				<label htmlFor="participantID">4D Number</label>
				<input value={participantID} onChange={(e) => setParticipantID(e.target.value)} placeholder="E.g 4112" type="text" id="participantID" name="participantID" required/>
				<button type="submit" disabled={submitLoad1 || submitLoad2 || submitLoad3} className={(submitLoad1 || submitLoad2 || submitLoad3) ? 'loading-button' : ''}>{submitLoad3 ? 'Submitting...' : 'Submit'}</button>
            </form>

			{(submitLoad1 && submitLoad2) ? (
				<div>
					{submitLoad2 && <p>Name not valid</p>}
					<div style={{ marginTop: '-10px' }}>
						{submitLoad2 && <p>4D not valid</p>}
					</div>
				</div>
				) : (
				<div>
					{submitLoad1 && <p>Name not valid</p>}
					{submitLoad2 && <p>4D not valid</p>}
				</div>
			)}
			{enrollmentError && <p>{enrollmentError}</p>}
        </div>
    )
}