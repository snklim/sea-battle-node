import {
    createStore,
    applyMiddleware
} from '@reduxjs/toolkit';

const initialState = {
    value: 0
}

const loggerMiddleware = storeAPI => next => action => {
    console.log('before');
    let result = next(action);
    console.log('after');
    return result;
}

export default createStore((state = initialState, action) => {
    if (action.type === 'counter/incremented') {
        return {
            ...state,
            value: state.value + 1
        }
    }
    return state
}, applyMiddleware(loggerMiddleware))