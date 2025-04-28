import React from "react";
import "./DrawModal.css";
import { Link } from "react-router-dom";

function DrawModal({ setOpenModal }) {
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="titleCloseBtn">
          <button
            onClick={() => {
              setOpenModal(false);
            }}
          >
            X
          </button>
        </div>
        <div className="title">
          <h1>Congratulations you have completed the System Design</h1>
        </div>
        <div className="body">
          <p>The next page looks amazing. Hope you want to go there!</p>
        </div>
        <div className="footer">
          <button
            onClick={() => {
              setOpenModal(false);
            }}
            id="cancelBtn"
          >
            Cancel
          </button>
            <Link to="/editor">
          <button>Continue</button></Link>
        </div>
      </div>
    </div>
  );
}

export default DrawModal;