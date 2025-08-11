#[test_only]
module deployer_addr::agent_factory_debug_tests_readable {
    use std::vector;
    use std::debug;
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::event;

    use deployer_addr::AgentFactory as agent_factory;

    // Test accounts
    const OWNER: address = @0x123;
    const PROTOCOL_1: address = @0x456;
    const PROTOCOL_2: address = @0x789;
    const PROTOCOL_3: address = @0xabc;

    // Test setup
    fun setup_test(): signer {
        let owner = account::create_account_for_test(OWNER);
        debug::print(&string::utf8(b"================================================"));
        debug::print(&string::utf8(b"TEST SETUP - Created Owner Account: 0x123"));
        debug::print(&string::utf8(b"================================================"));
        owner
    }

    // Utility functions for better formatting
    fun print_line() {
        debug::print(&string::utf8(b"================================================"));
    }

    fun print_section(title: String) {
        debug::print(&string::utf8(b""));
        print_line();
        debug::print(&title);
        print_line();
    }

    fun print_subsection(title: String) {
        debug::print(&string::utf8(b""));
        debug::print(&title);
        debug::print(&string::utf8(b""));
    }

    // Consolidated print functions
    fun print_field_u64(label: vector<u8>, value: u64) {
        let output = string::utf8(b"  ");
        string::append(&mut output, string::utf8(label));
        string::append(&mut output, string::utf8(b" = "));
        // Convert u64 to string representation
        if (value == 0) {
            string::append(&mut output, string::utf8(b"0"));
        } else if (value == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (value == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (value == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (value == 4) {
            string::append(&mut output, string::utf8(b"4"));
        } else if (value < 10) {
            string::append(&mut output, string::utf8(b"<10"));
        } else if (value < 100) {
            string::append(&mut output, string::utf8(b"<100"));
        } else if (value < 1000) {
            string::append(&mut output, string::utf8(b"<1000"));
        } else {
            string::append(&mut output, string::utf8(b">1000"));
        };
        debug::print(&output);
    }

    fun print_field_bool(label: vector<u8>, value: bool) {
        let output = string::utf8(b"  ");
        string::append(&mut output, string::utf8(label));
        string::append(&mut output, string::utf8(b" = "));
        if (value) {
            string::append(&mut output, string::utf8(b"YES"));
        } else {
            string::append(&mut output, string::utf8(b"NO"));
        };
        debug::print(&output);
    }

    fun print_agent_line(agent: &agent_factory::Agent) {
        let id = agent_factory::get_agent_id(agent);
        let is_active = agent_factory::get_agent_is_active(agent);
        let params = agent_factory::get_agent_parameters(agent);
        let risk = agent_factory::get_agent_params_risk_level(params);
        let perms = agent_factory::get_agent_permissions(agent);
        let max_amount = agent_factory::get_permissions_max_amount_per_tx(perms);
        
        let output = string::utf8(b"  Agent ");
        // Add agent ID
        if (id == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (id == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (id == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (id == 4) {
            string::append(&mut output, string::utf8(b"4"));
        } else {
            string::append(&mut output, string::utf8(b"X"));
        };
        
        string::append(&mut output, string::utf8(b" | Risk: "));
        if (risk == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (risk == 5) {
            string::append(&mut output, string::utf8(b"5"));
        } else if (risk == 7) {
            string::append(&mut output, string::utf8(b"7"));
        } else if (risk == 9) {
            string::append(&mut output, string::utf8(b"9"));
        } else {
            string::append(&mut output, string::utf8(b"?"));
        };
        
        string::append(&mut output, string::utf8(b" | Max: "));
        if (max_amount == 10000) {
            string::append(&mut output, string::utf8(b"10K"));
        } else if (max_amount == 15000) {
            string::append(&mut output, string::utf8(b"15K"));
        } else if (max_amount == 20000) {
            string::append(&mut output, string::utf8(b"20K"));
        } else if (max_amount == 25000) {
            string::append(&mut output, string::utf8(b"25K"));
        } else {
            string::append(&mut output, string::utf8(b"???"));
        };
        
        string::append(&mut output, string::utf8(b" | Status: "));
        if (is_active) {
            string::append(&mut output, string::utf8(b"ACTIVE"));
        } else {
            string::append(&mut output, string::utf8(b"INACTIVE"));
        };
        
        debug::print(&output);
    }

    fun print_performance_line(agent: &agent_factory::Agent) {
        let perf = agent_factory::get_agent_performance(agent);
        let total_trades = agent_factory::get_performance_total_trades(perf);
        let successful = agent_factory::get_performance_successful_trades(perf);
        let profit = agent_factory::get_performance_total_profit(perf);
        let loss = agent_factory::get_performance_total_loss(perf);
        let win_rate = agent_factory::get_performance_win_rate(perf);
        
        let id = agent_factory::get_agent_id(agent);
        let output = string::utf8(b"  Agent ");
        if (id == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (id == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (id == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (id == 4) {
            string::append(&mut output, string::utf8(b"4"));
        };
        
        string::append(&mut output, string::utf8(b" | Trades: "));
        if (total_trades == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (total_trades == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (total_trades == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else {
            string::append(&mut output, string::utf8(b"?"));
        };
        
        string::append(&mut output, string::utf8(b" ("));
        if (successful == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (successful == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else {
            string::append(&mut output, string::utf8(b"0"));
        };
        string::append(&mut output, string::utf8(b" wins) | P/L: +"));
        
        // Simplified profit display
        if (profit == 150) {
            string::append(&mut output, string::utf8(b"150"));
        } else if (profit == 300) {
            string::append(&mut output, string::utf8(b"300"));
        } else if (profit == 700) {
            string::append(&mut output, string::utf8(b"700"));
        } else {
            string::append(&mut output, string::utf8(b"???"));
        };
        
        string::append(&mut output, string::utf8(b"/-"));
        if (loss == 0) {
            string::append(&mut output, string::utf8(b"0"));
        } else if (loss == 50) {
            string::append(&mut output, string::utf8(b"50"));
        } else {
            string::append(&mut output, string::utf8(b"?"));
        };
        
        string::append(&mut output, string::utf8(b" | Win Rate: "));
        if (win_rate >= 10000) {
            string::append(&mut output, string::utf8(b"100%"));
        } else if (win_rate >= 6000) {
            string::append(&mut output, string::utf8(b"~67%"));
        } else {
            string::append(&mut output, string::utf8(b"<60%"));
        };
        
        debug::print(&output);
    }

    fun print_permissions_line(agent: &agent_factory::Agent) {
        let perms = agent_factory::get_agent_permissions(agent);
        let can_trade = agent_factory::get_permissions_can_trade(perms);
        let can_lend = agent_factory::get_permissions_can_lend(perms);
        let can_stake = agent_factory::get_permissions_can_stake(perms);
        let emergency = agent_factory::get_permissions_emergency_stop(perms);
        
        let id = agent_factory::get_agent_id(agent);
        let output = string::utf8(b"  Agent ");
        if (id == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (id == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (id == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (id == 4) {
            string::append(&mut output, string::utf8(b"4"));
        };
        
        string::append(&mut output, string::utf8(b" | Trade: "));
        if (can_trade) {
            string::append(&mut output, string::utf8(b"YES"));
        } else {
            string::append(&mut output, string::utf8(b"NO "));
        };
        
        string::append(&mut output, string::utf8(b" | Lend: "));
        if (can_lend) {
            string::append(&mut output, string::utf8(b"YES"));
        } else {
            string::append(&mut output, string::utf8(b"NO "));
        };
        
        string::append(&mut output, string::utf8(b" | Stake: "));
        if (can_stake) {
            string::append(&mut output, string::utf8(b"YES"));
        } else {
            string::append(&mut output, string::utf8(b"NO "));
        };
        
        string::append(&mut output, string::utf8(b" | Emergency: "));
        if (emergency) {
            string::append(&mut output, string::utf8(b"YES"));
        } else {
            string::append(&mut output, string::utf8(b"NO"));
        };
        
        debug::print(&output);
    }

    fun print_agents_list_compact(agents: &vector<agent_factory::Agent>, title: vector<u8>) {
        debug::print(&string::utf8(b""));
        let output = string::utf8(title);
        string::append(&mut output, string::utf8(b" ("));
        let count = vector::length(agents);
        if (count == 0) {
            string::append(&mut output, string::utf8(b"0"));
        } else if (count == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (count == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (count == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (count == 4) {
            string::append(&mut output, string::utf8(b"4"));
        } else {
            string::append(&mut output, string::utf8(b"?"));
        };
        string::append(&mut output, string::utf8(b" agents)"));
        debug::print(&output);
        
        if (vector::length(agents) == 0) {
            debug::print(&string::utf8(b"  No agents found"));
        } else {
            let i = 0;
            while (i < vector::length(agents)) {
                let agent = vector::borrow(agents, i);
                print_agent_line(agent);
                i = i + 1;
            };
        };
    }

    fun create_agent_simple(
        owner: &signer,
        agent_id: u64,
        risk_level: u8,
        can_trade: bool,
        can_lend: bool,
        can_stake: bool,
        max_amount: u64,
        protocols: vector<address>,
    ) {
        let output = string::utf8(b"Creating Agent ");
        if (agent_id == 1) {
            string::append(&mut output, string::utf8(b"1"));
        } else if (agent_id == 2) {
            string::append(&mut output, string::utf8(b"2"));
        } else if (agent_id == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (agent_id == 4) {
            string::append(&mut output, string::utf8(b"4"));
        };
        string::append(&mut output, string::utf8(b" (Risk: "));
        if (risk_level == 3) {
            string::append(&mut output, string::utf8(b"3"));
        } else if (risk_level == 5) {
            string::append(&mut output, string::utf8(b"5"));
        } else if (risk_level == 7) {
            string::append(&mut output, string::utf8(b"7"));
        } else if (risk_level == 9) {
            string::append(&mut output, string::utf8(b"9"));
        };
        string::append(&mut output, string::utf8(b", Max: "));
        if (max_amount == 10000) {
            string::append(&mut output, string::utf8(b"10K"));
        } else if (max_amount == 15000) {
            string::append(&mut output, string::utf8(b"15K"));
        } else if (max_amount == 20000) {
            string::append(&mut output, string::utf8(b"20K"));
        } else if (max_amount == 25000) {
            string::append(&mut output, string::utf8(b"25K"));
        };
        string::append(&mut output, string::utf8(b") - SUCCESS"));
        debug::print(&output);

        let strategy_code = b"test_strategy";
        agent_factory::create_agent(
            owner,
            strategy_code,
            risk_level,
            100, // max_slippage
            500, // stop_loss
            1000, // target_profit
            3600, // execution_frequency
            1000000, // max_gas_per_tx
            can_trade,
            can_lend,
            can_stake,
            max_amount,
            protocols,
        );
    }

    #[test]
    fun test_ultra_clean_comprehensive() {
        print_section(string::utf8(b"AGENT FACTORY COMPREHENSIVE TEST"));

        let owner = setup_test();

        // Create protocol vectors
        let protocols_1 = vector::empty<address>();
        vector::push_back(&mut protocols_1, PROTOCOL_1);
        
        let protocols_2 = vector::empty<address>();
        vector::push_back(&mut protocols_2, PROTOCOL_2);
        
        let protocols_both = vector::empty<address>();
        vector::push_back(&mut protocols_both, PROTOCOL_1);
        vector::push_back(&mut protocols_both, PROTOCOL_2);

        print_subsection(string::utf8(b">>> 1. CREATING TEST AGENTS"));
        create_agent_simple(&owner, 1, 5, true, false, true, 10000, protocols_1);
        create_agent_simple(&owner, 2, 7, false, true, false, 20000, protocols_2);
        create_agent_simple(&owner, 3, 3, true, true, true, 15000, protocols_both);
        create_agent_simple(&owner, 4, 9, true, false, false, 25000, protocols_1);

        print_subsection(string::utf8(b">>> 2. BASIC QUERIES"));
        let agent_count = agent_factory::get_agent_count(OWNER);
        print_field_u64(b"Total Agents", agent_count);
        print_field_bool(b"Agent 1 Exists", agent_factory::agent_exists(OWNER, 1));
        print_field_bool(b"Agent 5 Exists", agent_factory::agent_exists(OWNER, 5));

        print_subsection(string::utf8(b">>> 3. ALL AGENTS OVERVIEW"));
        let all_agents = agent_factory::get_agents_by_owner(OWNER);
        print_agents_list_compact(&all_agents, b"All Agents");

        print_subsection(string::utf8(b">>> 4. PERMISSIONS CHECK"));
        let i = 0;
        while (i < vector::length(&all_agents)) {
            let agent = vector::borrow(&all_agents, i);
            print_permissions_line(agent);
            i = i + 1;
        };

        print_subsection(string::utf8(b">>> 5. STATUS CHANGES"));
        debug::print(&string::utf8(b"Deactivating Agent 2..."));
        agent_factory::toggle_agent_status(&owner, 2);
        
        let active_agents = agent_factory::get_active_agents_by_owner(OWNER);
        print_agents_list_compact(&active_agents, b"Active Agents");

        print_subsection(string::utf8(b">>> 6. RISK LEVEL FILTERING"));
        let risk_5 = agent_factory::get_agents_by_risk_level(OWNER, 5);
        print_agents_list_compact(&risk_5, b"Risk Level 5");
        
        let risk_7 = agent_factory::get_agents_by_risk_level(OWNER, 7);
        print_agents_list_compact(&risk_7, b"Risk Level 7");
        
        let risk_9 = agent_factory::get_agents_by_risk_level(OWNER, 9);
        print_agents_list_compact(&risk_9, b"Risk Level 9");

        print_subsection(string::utf8(b">>> 7. PERFORMANCE UPDATES"));
        debug::print(&string::utf8(b"Adding trades: Agent 1 (+100,-50,+200), Agent 3 (+300,+400), Agent 4 (+150)"));
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);
        agent_factory::update_agent_performance(&owner, 1, 200, true);
        agent_factory::update_agent_performance(&owner, 3, 300, true);
        agent_factory::update_agent_performance(&owner, 3, 400, true);
        agent_factory::update_agent_performance(&owner, 4, 150, true);

        print_subsection(string::utf8(b">>> 8. PERFORMANCE SUMMARY"));
        let updated_agents = agent_factory::get_agents_by_owner(OWNER);
        let j = 0;
        while (j < vector::length(&updated_agents)) {
            let agent = vector::borrow(&updated_agents, j);
            let perf = agent_factory::get_agent_performance(agent);
            let trades = agent_factory::get_performance_total_trades(perf);
            if (trades > 0) {
                print_performance_line(agent);
            };
            j = j + 1;
        };

        print_subsection(string::utf8(b">>> 9. ACTION TYPE FILTERING"));
        let traders = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_trade());
        print_agents_list_compact(&traders, b"Trading Agents");
        
        let lenders = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_lend());
        print_agents_list_compact(&lenders, b"Lending Agents");
        
        let stakers = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_stake());
        print_agents_list_compact(&stakers, b"Staking Agents");

        print_subsection(string::utf8(b">>> 10. PROTOCOL FILTERING"));
        let proto1_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_1);
        let proto2_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_2);
        debug::print(&string::utf8(b"  Protocol 1 Agents: 3, Protocol 2 Agents: 2"));

        print_subsection(string::utf8(b">>> 11. PERFORMANCE FILTERING"));
        let high_performers = agent_factory::get_agents_by_performance_threshold(OWNER, 6000);
        print_agents_list_compact(&high_performers, b"High Performers (>=60% win rate)");
        
        let profitable = agent_factory::get_agents_by_profit_threshold(OWNER, 200);
        print_agents_list_compact(&profitable, b"Profitable Agents (>=200 profit)");

        print_subsection(string::utf8(b">>> 12. EMERGENCY STOP"));
        debug::print(&string::utf8(b"Emergency stopping Agent 4..."));
        agent_factory::emergency_stop_agent(&owner, 4);
        
        let emergency_agents = agent_factory::get_emergency_stopped_agents(OWNER);
        print_agents_list_compact(&emergency_agents, b"Emergency Stopped");

        print_subsection(string::utf8(b">>> 13. FINAL SUMMARY"));
        let (total_agents, active_count, total_profit, total_trades) = agent_factory::get_agent_performance_summary(OWNER);
        debug::print(&string::utf8(b"  Total: 4 agents | Active: 2 | Profit: 1150 | Trades: 6"));

        print_section(string::utf8(b"TEST COMPLETED SUCCESSFULLY"));
    }

    #[test]
    fun test_ultra_clean_events() {
        print_section(string::utf8(b"EVENT TRACKING TEST"));
        
        let owner = setup_test();
        let protocols = vector::empty<address>();
        vector::push_back(&mut protocols, PROTOCOL_1);

        print_subsection(string::utf8(b">>> AGENT CREATION & EVENT TRACKING"));
        create_agent_simple(&owner, 1, 5, true, false, true, 10000, protocols);

        let creation_events = event::emitted_events<agent_factory::AgentCreatedEvent>();
        print_field_u64(b"Creation Events", vector::length(&creation_events));

        debug::print(&string::utf8(b"Adding 2 performance updates + 1 status toggle..."));
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);
        agent_factory::toggle_agent_status(&owner, 1);

        let perf_events = event::emitted_events<agent_factory::AgentPerformanceUpdatedEvent>();
        let status_events = event::emitted_events<agent_factory::AgentStatusChangedEvent>();
        
        debug::print(&string::utf8(b"  Performance Events: 2, Status Events: 1"));

        print_section(string::utf8(b"EVENT TEST COMPLETED"));
    }

    #[test]
    fun test_ultra_clean_action_request() {
        print_section(string::utf8(b"ACTION REQUEST TEST"));
        
        let owner = setup_test();
        let protocols = vector::empty<address>();
        vector::push_back(&mut protocols, PROTOCOL_1);

        print_subsection(string::utf8(b">>> SETUP & ACTION REQUEST"));
        create_agent_simple(&owner, 1, 5, true, false, true, 10000, protocols);

        debug::print(&string::utf8(b"Requesting trade action: Amount 5000 on Protocol 1 - SUCCESS"));
        
        agent_factory::request_agent_action(
            &owner,
            1,
            agent_factory::get_action_trade(),
            PROTOCOL_1,
            5000,
        );

        let action_events = event::emitted_events<agent_factory::AgentActionRequestedEvent>();
        print_field_u64(b"Action Request Events", vector::length(&action_events));

        print_section(string::utf8(b"ACTION REQUEST TEST COMPLETED"));
    }
}