import React from 'react'

function Lobby(props) {

  // lobby.lobby

  

  return (
    <>
    <div>{props.lobby.name}</div>
    <div>{props.lobby.id}</div>
    <div>{props.lobby.num_players}/8</div>
    <div>{props.lobby.state}</div>
    <button> join</button>
    </>
  )
}

export default Lobby