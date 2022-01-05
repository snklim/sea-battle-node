import logo from './logo.svg';
import './App.css';
import { useState, useEffect, useCallback } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import store from './Store';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <header className="App-header">
            <Link to="/">Home</Link>
            <Link to="/otherpage/-1">Other Page</Link>
          </header>
          <div>
            <Routes>
              <Route exact path="/" element={<OtherPage />} />
              <Route path="/otherpage/:id" element={<Game />} />
            </Routes>
          </div>
        </div>
      </Router>
    </Provider>
  );
}

function OtherPage() {

  const [games, setGames] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/').then(res => {
      setGames(res.data.games);
    })
  }, [setGames]);

  const onClick = index => {
    navigate(`/otherpage/${index}`)
  }

  return (<div>
    <div className='game-select' onClick={() => onClick(-1)}>Create new game</div>
    {games.map(index => (<div key={index} className='game-select' onClick={() => onClick(index)}>Play {index} game</div>))}
  </div>);
}

function Game() {

  const params = useParams();

  const [fields, setFields] = useState([]);
  const [message, setMessage] = useState('');

  const count = useSelector(state => state.value)

  const {
    sendJsonMessage,
    lastJsonMessage,
    readyState
  } = useWebSocket(`ws://${window.location.host}/api`, {
    onOpen: () => sendJsonMessage({ event: 'start', payload: { id: params.id } })
  });

  useEffect(() => {
    if (lastJsonMessage !== null) {
      if (lastJsonMessage.event === 'update') {
        console.log(lastJsonMessage)
        setFields(lastJsonMessage.payload.fields);
        setMessage(lastJsonMessage.payload.message);
      }
    }
  }, [lastJsonMessage]);

  const onClick = cell => {
    if (cell.enemy) {
      sendJsonMessage({ event: 'move', payload: { game: cell.game, index: cell.index, target: cell.target } });

      store.dispatch({ type: 'counter/incremented' })
    }
  };

  return (
    <div className="game">
      <div>{count}</div>
      {fields.map((field, index) => (<Field key={index} cells={field} onClick={onClick} />))}
      <div className='clearBoth'></div>
      <div>{message}</div>
    </div>);
}

function Field(props) {
  return (<div className="field">
    {[...Array(10).keys()].map(index => (<Row key={index} cells={props.cells} index={index} onClick={props.onClick} />))}
  </div>);
}

function Row(props) {
  return (<div className="row" data-index={props.index}>
    {
      props.cells.slice(props.index * 10, props.index * 10 + 10).map((cell, index) => (<Cell key={index} cell={cell} onClick={props.onClick} />))
    }
  </div>);
}

function Cell(props) {
  let className = "cell";
  className += " " + props.cell.type;
  return (<div className={className} onClick={() => props.onClick(props.cell)}></div>);
}

export default App;