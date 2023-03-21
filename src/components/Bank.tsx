import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import idl from "../../idl/solanapdas.json";
import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const programID = new PublicKey(idl.metadata.address);
const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);

type Bank = {
    balance: BN,
    name: string,
    owner: PublicKey,
    pubkey: PublicKey,
}

export const Bank: FC = () => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [banks, setBanks] = useState<Bank[]>([])
    const getProvider = () => {
        return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    };

    const createBank = async () => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);
            const [bank] = PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("bankaccount"),
                anchorProvider.wallet.publicKey.toBuffer(),
            ], program.programId);

            await program.rpc.create(`Bank of ${anchorProvider.wallet.publicKey.toString().slice(0, 6)}`, {
                accounts: {
                    bank,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });

            console.log(`Bank was created: ${bank.toString()}`);
            fetchBanks();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    };

    const fetchBanks = async () => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);

            let fetchedBanks = [];
            let programAccounts = await Promise.all((await connection.getProgramAccounts(programID)));
            for (let bank of programAccounts) {
                let bankInfo = await program.account.bank.fetch(bank.pubkey);
                fetchedBanks.push({ ...bankInfo, pubkey: bank.pubkey })
            }

            setBanks(fetchedBanks);
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    };

    const depositBank = async (publicKey: PublicKey) => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);

            const [bank] = PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("bankaccount"),
                anchorProvider.wallet.publicKey.toBuffer(),
            ], program.programId);

            await program.rpc.deposit(new BN(0.1 * LAMPORTS_PER_SOL), {
                accounts: {
                    bank: publicKey,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });

            console.log(`Deposit to bank ${publicKey.toString()} successful`);
            fetchBanks();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    };

    const withdrawBank = async (amount: BN, publicKey: PublicKey) => {
        try {
            if (parseInt(amount.toString()) === 0) {
                throw new Error("Error - Nothing to withdraw");
            }
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);

            await program.rpc.withdraw(amount, {
                accounts: {
                    bank: publicKey,
                    user: anchorProvider.wallet.publicKey,
                }
            });

            console.log(`Withdrawal from bank ${publicKey.toString()} successful`);
            fetchBanks();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    };

    return (
        <div className='flex flex-col'>
            <div className='flex flex-row justify-center gap-4 mb-10'>
                {
                    banks && banks.length > 0 &&
                    banks.map((bank, index) => (
                        <div className='border border-violet-400 rounded-xl p-4' key={index}>
                            <p className='text-violet-400'>{bank.name}</p>
                            <p>balance: {parseInt(bank.balance.toString()) / LAMPORTS_PER_SOL}</p>
                            <button
                                className='w-60 m-2 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
                                onClick={() => depositBank(bank.pubkey)}
                                disabled={!wallet.publicKey}
                            >
                                {
                                    bank.owner.toString() === wallet?.publicKey?.toString() ? "Deposit" : "Donate"
                                }
                            </button>
                            <button
                                className='w-60 m-2 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
                                onClick={() => withdrawBank(bank.balance, bank.pubkey)}
                                disabled={(bank.owner.toString() !== wallet?.publicKey?.toString()) || parseInt(bank.balance.toString()) === 0}
                            >
                                Withdraw all
                            </button>
                        </div>
                    ))
                }
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={createBank}
                        disabled={!wallet.publicKey}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Create bank
                        </span>
                    </button>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={fetchBanks}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Fetch banks
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
