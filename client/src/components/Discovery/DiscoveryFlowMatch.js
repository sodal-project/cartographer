import React, { useState } from 'react';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DiscoveryIconEdit from './DiscoveryIconEdit';
import DiscoveryIconDelete from './DiscoveryIconDelete';
import DiscoveryIconArrow from './DiscoveryIconArrow';
import DiscoveryAdd from './DiscoveryAdd';
import DiscoveryAddMatch from './DiscoveryAddMatch';
import DiscoveryFlowField from './DiscoveryFlowField';
import DiscoveryFlowControl from './DiscoveryFlowControl';
import DiscoveryFlowSet from './DiscoveryFlowSet';

export default function DiscoveryFlowMatch({ filter, onDelete, onSave, onEdit }) {
  const [mode, setMode] = useState('view');
  const [isHovered, setIsHovered] = useState(false);

  const directions = {
    in: "Match In",
    notin: "Match Not In",
  }

  const handleOnEdit = () => {
    const newMode = (mode === 'edit') ? 'view' : 'edit'
    setMode(newMode)
  }

  const handleOnSave = (item) => {
    const newFilter = {...filter, ...item}
    onEdit(newFilter)
    setMode('view')
  }

  return (
    <div
      className="relative bg-gray-900 border border-gray-600 rounded-md px-3 py-3 mt-12 mb-6"
    >
      <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
        className="relative bg-gray-900 border border-gray-600 rounded-full mx-4 px-4 py-3 -mt-9 mb-6">
        <FontAwesomeIcon icon={faCodeBranch}
          className="text-indigo-600 mt-0.5 mr-2 float-left" />
        <p className="text-white text-sm whitespace-nowrap">{directions[filter.direction]}</p>
        <DiscoveryIconEdit show={isHovered} onClick={() => handleOnEdit()} />
        <DiscoveryIconDelete show={isHovered} onClick={() => onDelete(filter.id)} />
      </div>
      <div className="text-white">
        {filter.subset?.map((item, index) => {
          if (item.type === "filterControl") {
            return <DiscoveryFlowControl filter={item} key={index} onDelete={onDelete} onSave={onSave} onEdit={onEdit} />
          } else if (item.type === "filterMatch") {
            return <DiscoveryFlowMatch filter={item} key={index} onDelete={onDelete} onSave={onSave} onEdit={onEdit} />
          } else if (item.type === "filterSet") {
            return <DiscoveryFlowSet filter={item} key={index} onDelete={onDelete} onSave={onSave} onEdit={onEdit} />
          }
          return <DiscoveryFlowField filter={item} key={index} onDelete={onDelete} onEdit={onEdit} />
        })}
      </div>
      <DiscoveryAdd onSave={onSave} parentId={filter.id} />
      <DiscoveryIconArrow />
      {mode === 'edit' && (
        <DiscoveryAddMatch onSave={(item) => {handleOnSave(item)}} onCancel={() => setMode('view')} data={filter} />
      )}
    </div>
  )
}
