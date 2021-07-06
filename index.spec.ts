import { mutation, ListState } from './index'
import { state } from 'fp-ts'
// import { computed }

describe('fp-ts', () => {
  const init = {
    isLoading: true,
    list: ['apple', 'banana', 'grape'],
    selected: 'apple',
  }
  test('1 + 1', () => {
    const expected = state.gets<ListState, string>((s) => 'wow')
    // expect(mutation()).toStrictEqual(expected())
  })
})
