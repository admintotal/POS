import * as actions from '../constants/ActionTypes';


type actionType = {
  type: string
};

const defaultState = () => {
    return {
        ac_productos: [],
        ac_producto: '',
    }
}

export default function verificadorPrecios(state={...defaultState()}, action: actionType) {
    switch (action.type) {
        case actions.VP_AUTOCOMPLETE_PRODUCTO:
            return {...state, ac_productos: action.data.objects}

        case actions.SET_VP_AUTOCOMPLETE_PRODUCTO:
            return {...state, ac_producto: action.producto}

        default:
          return state;

    }

}