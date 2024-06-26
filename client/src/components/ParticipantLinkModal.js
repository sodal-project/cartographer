import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { faPlus, faX } from '@fortawesome/free-solid-svg-icons'
import ParticipantList from './ParticipantList';
import ParticipantForm from './Forms/ParticipantForm';
import Detail from './Detail/Detail';
import Button from './Button'

export default function ParticipantLinkModal({
  currentUpn,
  personaName,
  onAddSuccess,
  onCloseModal,
}) {
  const [participants, setParticipants] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // Load Participants
  const fetchData = async (filters) => {
    const requestBody = {
      page: 1,
      pageSize: 100000,
      filterQuery: `[{"type":"filterField","name":"type","operator":"=","value":"participant","id":1}]`
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set the content type to JSON
        },
        body: JSON.stringify(requestBody), // Convert the request body to JSON
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const body = await response.json();
      const records = body.records;
      if (records?.length > 0){
        const personas = records.map(node => node._fields[0].properties);
        setParticipants(personas);
      } else {
        setParticipants([])
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onLinkParticipant = async (onSuccess, participantUpn) => {
    const requestData = {
      personaUpn: currentUpn,
      participantUpn: participantUpn || currentParticipant?.upn,
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/persona-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        toast.success('Participant linked')
        if (onSuccess) {
          onSuccess()
        }
      } else {
        console.log('error')
      }
    } catch (error) {
      console.error(error);
    }
  }

  const onParticipantNameClick = (item) => {
    setCurrentParticipant(item)
  }

  const onClickSidebarLink = (item) => {
    onLinkParticipant(() => { setCurrentParticipant(item) }, item.upn)
  }

  const toggleParticipantForm = () => {
    setShowAddParticipant(!showAddParticipant)
  }

  const handleParticipantAdded = () => {
    fetchData() // Fetch data in the modal view
    onAddSuccess() // Fetch data in the main discovery view so that it's correct when we close the modal
    setShowAddParticipant(!showAddParticipant)
  }
    
  return (
    <div className="relative flex bg-gray-900 rounded-lg border border-gray-700 h-full">
      <div className="absolute top-7 right-7">
        <Button icon={faX} type="outline-circle" click={onCloseModal} />
      </div>

      <div className="flex flex-col flex-none w-72 border-r border-gray-700">
        <div className="p-4 pb-0">
          <h3 className="text-white text-md font-bold mb-1">
            Participants
          </h3>
        </div>
        <div className="relative flex-1">
          <ParticipantList participants={participants} onParticipantNameClick={onParticipantNameClick} onLinkParticipant={onClickSidebarLink} />
        </div>
        <div className="border-t border-gray-700 p-4">
          <Button label="Add Participant" icon={faPlus} type="link" click={toggleParticipantForm} />
          {showAddParticipant && (
            <ParticipantForm onCancel={toggleParticipantForm} onSuccess={handleParticipantAdded} />
          )}
        </div>
      </div>

      <div className="flex-1">
        {currentParticipant && (
          <Detail currentUpn={currentParticipant.upn} onLinkParticipant={onLinkParticipant} linkTo={personaName} mode="modal" />
        )}
      </div>
    </div>
  )
}