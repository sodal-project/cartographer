import React, { useState } from 'react';
import Bubble from '../Bubble';
import Button from '../Button';

export default function DiscoveryMenuDelete({
  onDelete,
  onCancel,
  currentSetId
}) {  
  const deleteSet = () => {
    onDelete(currentSetId)
    console.log("Delete")
  }

  return (
    <Bubble title="Delete Set" pointPosition="right" className="absolute top-16 right-0 z-10">
      <div className='w-full'>
        <div className="flex gap-4 items-center mx-auto">
          <Button className="flex-1" label="Delete" click={deleteSet} />
          <Button className="flex-1" label="Cancel" type="outline" click={onCancel} />
        </div>
      </div>
    </Bubble>
  )
}
