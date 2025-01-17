import type { Action } from 'redux';

interface petAction extends Action {
  payload?: {
    data?: any;
    item?: { id: number };
    error?: string;
  };
  error?: {
    data?: string;
  };
}

interface petState {
  data: any[];
  status: 'idle' | 'loading' | 'success' | 'failure';
  error: string | null;
}

const initialState: petState = {
  data: [],
  status: 'idle',
  error: null,
};

const SUCCESS_SUFFIX = '_SUCCESS';
const FAILURE_SUFFIX = '_FAIL';

const handleLoading = (state: petState): petState => ({
  ...state,
  status: 'loading',
  error: null,
});

const handleSuccess = (state: petState, action: petAction): petState => ({
  ...state,
  data: action.payload?.data || state.data,
  status: 'success',
  error: null,
});

const handleFailure = (state: petState, action: petAction): petState => ({
  ...state,
  status: 'failure',
  error: action.error?.data || null,
});

const handleAddSuccess = (state: petState, action: petAction): petState => ({
  ...state,
  data: [...state.data, action.payload?.data],
  status: 'success',
  error: null,
});

const handleUpdateSuccess = (state: petState, action: petAction): petState => ({
  ...state,
  data: state.data.map(item =>
    item.id === action.payload?.data?.id ? action.payload?.data : item
  ),
  status: 'success',
  error: null,
});

const handleDeleteSuccess = (state: petState, action: petAction): petState => ({
  ...state,
  data: state.data.filter(item => item.id !== action.payload?.item?.id),
  status: 'success',
  error: null,
});

const actionHandlers: { [key: string]: (state: petState, action: petAction) => petState } = {
  LISTUPDATEPET: handleLoading,
  ADDUPDATEPET: handleLoading,
  UPDATEUPDATEPET: handleLoading,
  DELETEUPDATEPET: handleLoading,
  LISTADDPET: handleLoading,
  ADDADDPET: handleLoading,
  UPDATEADDPET: handleLoading,
  DELETEADDPET: handleLoading,
  LISTFINDPETSBYSTATUS: handleLoading,
  ADDFINDPETSBYSTATUS: handleLoading,
  UPDATEFINDPETSBYSTATUS: handleLoading,
  DELETEFINDPETSBYSTATUS: handleLoading,
  LISTDELETEPET: handleLoading,
  ADDDELETEPET: handleLoading,
  UPDATEDELETEPET: handleLoading,
  DELETEDELETEPET: handleLoading,
  RESET_PET_STATE: () => initialState,
};

const petReducer = (state = initialState, action: petAction): petState => {
  const { type } = action;

  if (type.endsWith(SUCCESS_SUFFIX)) {
    if (type.startsWith('ADD')) return handleAddSuccess(state, action);
    if (type.startsWith('UPDATE')) return handleUpdateSuccess(state, action);
    if (type.startsWith('DELETE')) return handleDeleteSuccess(state, action);
    return handleSuccess(state, action);
  }

  if (type.endsWith(FAILURE_SUFFIX)) {
    return handleFailure(state, action);
  }

  const handler = actionHandlers[type];
  return handler ? handler(state, action) : state;
};

export default petReducer;
