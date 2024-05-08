import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { url } from '../App.js';

export const Response = () => {

    const [status, setStatus] = useState('Validating');
    const [dots, setDots] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    useEffect(() => {
        const validate = async () => {
            // Get the search parameters from the URL
            const searchParams = new URLSearchParams(window.location.search);

            // Extract the 'code' and 'state' values
            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (code === null || state === null){
                navigate('/error');
            }
        
            const apiUrl = url + '/participant/createParticipant';
            const requestData = { code: code };

            try {
                // Make the API call using the fetch API
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state}`,
                        },
                    body: JSON.stringify(requestData)
                });
                
                setLoading(false);
                const data = await response.json();

                if (response.ok) {
                    setStatus(`Validated - Enrolled: ${data.participantID}`);
                } else if (data.message === "Select all scopes and try again"){
                    setStatus("Rejected - Select all scopes and try again!");
                } else if (data.message === "Participant already exists") {
                    setStatus("Rejected - Participant has already enrolled!");
                } else if (data.message === "Participant 4D exist") {
                    setStatus("Rejected - 4D Taken! Approach Superior.");
                } else {
                    setStatus("Error - Sign up again!");
                }

            } catch (error) {
                setLoading(false);
                setStatus('Error - Sign up again!');
            }
        };
        validate();
    
        const intervalId = setInterval(() => {
            setDots(prevDots => (prevDots.length === 3 ? '' : prevDots + '.'));
        }, 500);
    
        return () => {
            clearInterval(intervalId);
        };
    }, [navigate]);

    return (
        <div>
            <h1 style={{ fontSize: '50px', color: status.includes("Validate") ? 'white' : 'rgb(255, 186, 186)' }}>
                {status}
                {loading && <span style={{ marginLeft: '10px'}}>{loading && dots}</span>}
            </h1>
            <h3>{!loading && status.includes("Validate") && "Do not refresh page before showing it to your superior"}</h3>
        </div>
    )
}