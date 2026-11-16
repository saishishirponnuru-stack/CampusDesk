import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Login,Modal} from '../src/main';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
const wrapper=({children})=><QueryClientProvider client={new QueryClient({defaultOptions:{mutations:{retry:false}}})}>{children}</QueryClientProvider>;
afterEach(()=>vi.unstubAllGlobals());
describe('Administrator login',()=>{
  it('provides labeled credentials and accessible error feedback',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401,json:async()=>({message:'Invalid email or password'})}));
    const user=userEvent.setup();render(<Login onLogin={vi.fn()}/>,{wrapper});
    await user.type(screen.getByLabelText('Email address'),'admin@example.test');
    await user.type(screen.getByLabelText('Password'),'incorrect');
    await user.click(screen.getByRole('button',{name:/Sign in to workspace/}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
  it('authenticates through the real API contract',async()=>{
    const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({token:'test-token'})});vi.stubGlobal('fetch',fetcher);
    const login=vi.fn(),user=userEvent.setup();render(<Login onLogin={login}/>,{wrapper});
    await user.type(screen.getByLabelText('Email address'),'admin@example.test');
    await user.type(screen.getByLabelText('Password'),'correct password');
    await user.click(screen.getByRole('button',{name:/Sign in to workspace/}));
    await waitFor(()=>expect(login).toHaveBeenCalledWith(true));
    expect(fetcher.mock.calls[0][0]).toBe('/api/auth/login');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({email:'admin@example.test',password:'correct password'});
  });
  it('uses native modal dialogs for keyboard focus containment',()=>{
    HTMLDialogElement.prototype.showModal=vi.fn();
    HTMLDialogElement.prototype.close=vi.fn();
    render(<Modal title="Confirm deletion" onClose={vi.fn()}><button>Cancel</button></Modal>);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Close dialog'})).toBeInTheDocument();
  });
});
