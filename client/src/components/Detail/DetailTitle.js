import { useState } from "react";
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import Button from "../Button";
import Modal from "../Modal";

export default function DetailTitle ({
  persona,
  onDeleteParticipant,
  onEditParticipant,
  onChooseParticipant
}) {
  const isParticipant = persona.type === "participant";
  const isSuspended = persona.status === "suspended";
  const name = isParticipant ? `${persona.firstName} ${persona.lastName}` : persona.friendlyName;
  const nickName = isParticipant ? persona.handle : persona.name;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal);
  }

  return (
    <>
      <h3 className="text-gray-400 text-sm capitalize inline-block relative">
        {persona.platform} {persona.type}
        {isSuspended && (
          <span className="text-white bg-red-500 rounded px-1.5 pb-0.5 pt-px inline-block text-xs ml-2">SUSPENDED</span>
        )}
      </h3>
      <h2 className="text-white text-lg font-bold capitalize">
        {name}
        {nickName && name.toLowerCase() !== nickName.toLowerCase() && <span className="text-gray-400"> ({nickName})</span>}
        {isParticipant && (
          <>
            <Button className="inline-block ml-3" type="icon" icon={faPenToSquare} click={onEditParticipant} />
            <Button className="inline-block ml-3" type="icon" icon={faTrash} click={toggleDeleteModal} />
          </>
        )}
        {!isParticipant && (
          <Button className="inline-block ml-3 relative -top-1" type="small" label="Link" click={() => { onChooseParticipant() }} />
        )}
      </h2>
      {showDeleteModal && (
        <Modal onClickOutside={toggleDeleteModal}>
          <div className="p-5">
            <h4 className="text-white font-bold text-center mb-5">Delete Participant "{`${name.trim() === "" ? nickName : name.trim()}`}"?</h4>
            <div className="flex gap-4 justify-center">
              <Button label="Delete" click={onDeleteParticipant} />
              <Button label="Cancel" type="outline" click={toggleDeleteModal} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}