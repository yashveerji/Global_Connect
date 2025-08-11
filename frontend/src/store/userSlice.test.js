import userReducer, { fetchUserData, setError } from './userSlice';

describe('User slice', () => {
    it('should handle initial state', () => {
        expect(userReducer(undefined, {})).toEqual({
            userData: null,
            loading: false,
            error: null,
        });
    });

    it('should handle setError', () => {
        expect(userReducer({}, setError('Error occurred'))).toEqual({
            error: 'Error occurred',
        });
    });
});
