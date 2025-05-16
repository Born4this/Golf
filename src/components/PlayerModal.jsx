import { useEffect } from 'react';

export default function PlayerModal({ isOpen, onClose, player }) {
  if (!isOpen || !player) return null;

  // calculate age if birthDate exists
  let age = 'N/A';
  if (player.profile.birthDate) {
    const dob = new Date(player.profile.birthDate);
    const diff = Date.now() - dob.getTime();
    age = Math.floor(diff / (1000*60*60*24*365.25));
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-sm w-full"
        onClick={e=>e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="float-right text-gray-600 hover:text-black"
        >✕</button>

        <div className="text-center">
          {player.profile.headshot && (
            <img
              src={player.profile.headshot}
              alt={player.profile.name}
              className="w-24 h-24 rounded-full mx-auto"
            />
          )}
          <h2 className="mt-2 text-xl font-semibold">{player.profile.name}</h2>
          {player.profile.flag && (
            <img
              src={player.profile.flag}
              alt="flag"
              className="inline-block w-6 h-4 ml-2 align-text-top"
            />
          )}
          <p className="mt-1 text-sm text-gray-700">
            Born: {player.profile.birthPlace.stateAbbreviation?.toUpperCase() || ''},
            {player.profile.birthPlace.countryAbbreviation?.toUpperCase()}
          </p>
          <p className="text-sm text-gray-700">Age: {age}</p>
        </div>

        <hr className="my-4" />

        <h3 className="font-medium">Last 5 Tournaments</h3>
        <ul className="mt-2 space-y-1">
          {player.recent.map((e,i) => (
            <li key={i} className="text-sm">
              • {e.name}: <span className="font-semibold">{e.toPar}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
