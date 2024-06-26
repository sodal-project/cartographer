import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Button from '../Button';
import DetailUpn from './DetailUpn';
import DetailTitle from './DetailTitle';
import DetailFields from './DetailFields';
import DetailNotes from './DetailNotes';
import Modal from '../Modal';
import ParticipantForm from '../Forms/ParticipantForm';
import Table from '../Table';
import Tabs from '../Tabs';

export default function Detail({
  onChooseParticipant,
  onLinkParticipant,
  onDeleteParticipant,
  currentUpn,
  linkTo,
  mode,
}) {
  const [persona, setPersona] = useState(null);
  const [personas, setPersonas] = useState([]);
  const isParticipant = persona?.type === "participant";
  const [currentTab, setCurrentTab] = useState(isParticipant ? "Participant Controls" : "Aliases");
  const tableTabs = isParticipant ? ["Participant Controls"] : ["Aliases", "Agent Controls", "Agent Obeys"];
  const [showAddModal, setShowAddModal] = useState(false)
 
  // Fetch Persona
  const fetchPersona = useCallback(async () => {
    try {
      const upn = encodeURIComponent(currentUpn);
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/persona?upn=${upn}`);
      const result = await response.json();
      setPersona(result);
    } catch (error) {
      console.error(error);
    }
  }, [currentUpn]);

  useEffect(() => {
    fetchPersona();
  }, [currentUpn, fetchPersona]);

  // Fetch Personas (for table)
  const fetchPersonas = useCallback(async () => {
    if (!persona) return;
    const currentTabKey = currentTab?.toLowerCase().replace(" ", "");
    const tableEndpoint = {
      participantcontrols: "persona-agents-control",
      aliases: "persona-agents",
      agentcontrols: "persona-agents-control",
      agentobeys: "persona-agents-obey",
    };
    
    if (!persona.upn) return;
    try {
      const upn = encodeURIComponent(persona.upn);
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/${tableEndpoint[currentTabKey]}?upn=${upn}&orderBy=friendlyName&orderByDirection=ASC`);
      const result = await response.json();
      setPersonas(result);
    } catch (error) {
      console.error(error);
    }
  }, [persona, currentTab]);

  useEffect(() => {
    fetchPersonas();
  }, [persona, fetchPersonas]);
  
  // Update current tab when switching between participant and agent
  useEffect(() => {
    const activeTab = isParticipant ? "Participant Controls" : "Aliases";
    setCurrentTab(activeTab);
  }, [isParticipant]);

  // Link / Unlink Participant
  const onUnlinkParticipant = async (unlinkUpn) => {
    const requestData = {
      personaUpn: unlinkUpn,
      participantUpn: persona.upn,
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/persona-unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      if (response.ok) {
        toast.success('Persona unlinked')
        fetchPersonas();
      } else {
        console.log('error')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleLinkParticipant = () => {
    onLinkParticipant(() => { fetchPersonas() })
  }

  const handleParticipantUpdated  = () => {
    fetchPersona();
    setShowAddModal(false)
  }

  // Toggles
  const toggleAddModal = () => {
    setShowAddModal(!showAddModal)
  }
  const onEditParticipant = () => {
    setShowAddModal(true)
    console.log('edit participant')
  }
  
  if (!persona) return <></>

  return (
    <div className="h-full flex flex-col">

      {/* Details */}
      <div className="flex p-6 pb-10">
        <div className="w-1/2">
          <DetailTitle persona={persona} onDeleteParticipant={onDeleteParticipant} onEditParticipant={onEditParticipant} onChooseParticipant={() => {onChooseParticipant(persona)}} />
        </div>
        <div className="w-1/2 pr-16">
          <DetailUpn upn={persona?.upn} />
        </div>
      </div>
      <div className="flex px-6 gap-4">
        <div className="w-2/3">
          <DetailFields persona={persona} />
        </div>
        {isParticipant && (
          <DetailNotes upn={persona?.upn} fieldValue={persona.notes || ''}/>
        )}
      </div>

      {/* Link Button */}
      {persona?.type === "participant" && mode === "modal" && (
        <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-lg mx-6 mt-4">
          <Button click={() => { handleLinkParticipant() }} label="Link" />
          <div className="text-white font-bold">
            Link this participant to "{linkTo}"
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="detail-tabs px-7 pt-7">
        <Tabs tabs={tableTabs} current={currentTab} setCurrentTab={(tabName) => {setCurrentTab(tabName)}}/>
      </div>
      <div className="detail-table mb-7 px-7 overflow-auto flex-1">
        <Table
          data={personas}
          showAccess={true}
          showUnlink={isParticipant && currentTab !== "Aliases"}
          onUnlinkParticipant={onUnlinkParticipant}
        />
      </div>

      {/* Edit Participant Modal */}
      {showAddModal && (
        <Modal onClickOutside={() => { toggleAddModal() }}>
          <div className="p-5">
            <h4 className="text-white font-bold text-center mb-5">Edit Participant</h4>
            <ParticipantForm
              upn={persona.upn}
              firstName={persona.firstName}
              lastName={persona.lastName}
              handle={persona.handle}
              onCancel={toggleAddModal}
              onSuccess={handleParticipantUpdated}
            />
          </div>
        </Modal>
      )}

    </div>
  )
}