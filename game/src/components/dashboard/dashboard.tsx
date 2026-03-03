import { useState, type SetStateAction } from 'react'


type DashboardProps = {
  setDashboard: React.Dispatch<SetStateAction<boolean>>
}

function Dashboard({setDashboard}: DashboardProps) {

  return (
    <>
      <div
        className="fixed top-0 left-0 w-screen h-screen bg-[#242424]"
        >
        <button
          onClick={()=>setDashboard(false)}
        >
          <h1>
            Close
          </h1>
        </button>
        <h2>Overall air health: Good</h2>
        <div>Show calendar of average aq</div>
        <div>Show graph throughout the day</div>
        <div>Show map</div>

      </div>
    </>
  )
}

export default Dashboard
