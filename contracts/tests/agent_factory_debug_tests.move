#[test_only]
module deployer_addr::agent_factory_debug_tests {
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
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"=========================================="));
        debug::print(&string::utf8(b"SETUP: Created test account"));
        debug::print(&string::utf8(b"Owner address: "));
        debug::print(&OWNER);
        debug::print(&string::utf8(b"=========================================="));
        debug::print(&string::utf8(b""));
        owner
    }

    // Helper function to create a test agent with debug output
    fun create_test_agent_with_debug(
        owner: &signer,
        agent_id: u64,
        risk_level: u8,
        can_trade: bool,
        can_lend: bool,
        can_stake: bool,
        max_amount: u64,
        protocols: vector<address>,
    ) {
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- CREATING AGENT ---"));
        debug::print(&string::utf8(b"Agent ID: "));
        debug::print(&agent_id);
        debug::print(&string::utf8(b"Risk Level: "));
        debug::print(&risk_level);
        debug::print(&string::utf8(b"Permissions:"));
        debug::print(&string::utf8(b"  - Can Trade: "));
        debug::print(&can_trade);
        debug::print(&string::utf8(b"  - Can Lend: "));
        debug::print(&can_lend);
        debug::print(&string::utf8(b"  - Can Stake: "));
        debug::print(&can_stake);
        debug::print(&string::utf8(b"Max Amount Per TX: "));
        debug::print(&max_amount);

        let strategy_code = b"test_strategy";
        agent_factory::create_agent(
            owner,
            strategy_code,
            risk_level, // risk_level
            100, // max_slippage
            500, // stop_loss
            1000, // target_profit
            3600, // execution_frequency
            1000000, // max_gas_per_tx
            can_trade,
            can_lend,
            can_stake,
            max_amount, // max_amount_per_tx
            protocols,
        );

        debug::print(&string::utf8(b"Agent created successfully!"));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print agent details
    fun print_agent_details(agent: &agent_factory::Agent, agent_name: String) {
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- AGENT DETAILS ---"));
        debug::print(&agent_name);
        debug::print(&string::utf8(b"ID: "));
        debug::print(&agent_factory::get_agent_id(agent));
        debug::print(&string::utf8(b"Owner: "));
        debug::print(&agent_factory::get_agent_owner(agent));
        debug::print(&string::utf8(b"Status: "));
        debug::print(&agent_factory::get_agent_is_active(agent));
        debug::print(&string::utf8(b"Total Value Managed: "));
        debug::print(&agent_factory::get_agent_total_value_managed(agent));
        debug::print(&string::utf8(b"Last Execution: "));
        debug::print(&agent_factory::get_agent_last_execution(agent));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print performance details
    fun print_performance_details(agent: &agent_factory::Agent, agent_name: String) {
        let perf = agent_factory::get_agent_performance(agent);
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- PERFORMANCE DETAILS ---"));
        debug::print(&agent_name);
        debug::print(&string::utf8(b"Total Trades: "));
        debug::print(&agent_factory::get_performance_total_trades(perf));
        debug::print(&string::utf8(b"Successful Trades: "));
        debug::print(&agent_factory::get_performance_successful_trades(perf));
        debug::print(&string::utf8(b"Total Profit: "));
        debug::print(&agent_factory::get_performance_total_profit(perf));
        debug::print(&string::utf8(b"Total Loss: "));
        debug::print(&agent_factory::get_performance_total_loss(perf));
        debug::print(&string::utf8(b"Win Rate: "));
        debug::print(&agent_factory::get_performance_win_rate(perf));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print parameters details
    fun print_parameters_details(agent: &agent_factory::Agent, agent_name: String) {
        let params = agent_factory::get_agent_parameters(agent);
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- PARAMETERS DETAILS ---"));
        debug::print(&agent_name);
        debug::print(&string::utf8(b"Risk Level: "));
        debug::print(&agent_factory::get_agent_params_risk_level(params));
        debug::print(&string::utf8(b"Max Slippage: "));
        debug::print(&agent_factory::get_agent_params_max_slippage(params));
        debug::print(&string::utf8(b"Stop Loss: "));
        debug::print(&agent_factory::get_agent_params_stop_loss(params));
        debug::print(&string::utf8(b"Target Profit: "));
        debug::print(&agent_factory::get_agent_params_target_profit(params));
        debug::print(&string::utf8(b"Execution Frequency: "));
        debug::print(&agent_factory::get_agent_params_execution_frequency(params));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print permissions details
    fun print_permissions_details(agent: &agent_factory::Agent, agent_name: String) {
        let perms = agent_factory::get_agent_permissions(agent);
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- PERMISSIONS DETAILS ---"));
        debug::print(&agent_name);
        debug::print(&string::utf8(b"Can Trade: "));
        debug::print(&agent_factory::get_permissions_can_trade(perms));
        debug::print(&string::utf8(b"Can Lend: "));
        debug::print(&agent_factory::get_permissions_can_lend(perms));
        debug::print(&string::utf8(b"Can Stake: "));
        debug::print(&agent_factory::get_permissions_can_stake(perms));
        debug::print(&string::utf8(b"Max Amount Per TX: "));
        debug::print(&agent_factory::get_permissions_max_amount_per_tx(perms));
        debug::print(&string::utf8(b"Emergency Stop: "));
        debug::print(&agent_factory::get_permissions_emergency_stop(perms));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print vector of agents
    fun print_agents_vector(agents: &vector<agent_factory::Agent>, description: String) {
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- AGENTS LIST ---"));
        debug::print(&description);
        debug::print(&string::utf8(b"Total Count: "));
        debug::print(&vector::length(agents));
        
        if (vector::length(agents) == 0) {
            debug::print(&string::utf8(b"No agents found"));
        } else {
            debug::print(&string::utf8(b"Agents:"));
            let i = 0;
            while (i < vector::length(agents)) {
                let agent = vector::borrow(agents, i);
                debug::print(&string::utf8(b"  "));
                debug::print(&i);
                debug::print(&string::utf8(b". Agent ID: "));
                debug::print(&agent_factory::get_agent_id(agent));
                debug::print(&string::utf8(b" (Active: "));
                debug::print(&agent_factory::get_agent_is_active(agent));
                debug::print(&string::utf8(b")"));
                i = i + 1;
            };
        };
        debug::print(&string::utf8(b""));
    }

    // Helper function to print section header
    fun print_section_header(title: String) {
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"=========================================="));
        debug::print(&title);
        debug::print(&string::utf8(b"=========================================="));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print subsection header
    fun print_subsection_header(title: String) {
        debug::print(&string::utf8(b""));
        debug::print(&string::utf8(b"--- "));
        debug::print(&title);
        debug::print(&string::utf8(b" ---"));
        debug::print(&string::utf8(b""));
    }

    // Helper function to print formatted result
    fun print_result(label: String, value: u64) {
        debug::print(&string::utf8(b""));
        debug::print(&label);
        debug::print(&string::utf8(b": "));
        debug::print(&value);
    }

    // Helper function to print formatted boolean result
    fun print_bool_result(label: String, value: bool) {
        debug::print(&string::utf8(b""));
        debug::print(&label);
        debug::print(&string::utf8(b": "));
        debug::print(&value);
    }

    // Helper function to print formatted address result
    fun print_address_result(label: String, value: address) {
        debug::print(&string::utf8(b""));
        debug::print(&label);
        debug::print(&string::utf8(b": "));
        debug::print(&value);
    }

    #[test]
    fun test_debug_view_functions_flow() {
        print_section_header(string::utf8(b"DEBUG VIEW FUNCTIONS FLOW TEST"));
        debug::print(&string::utf8(b"Testing all view functions with detailed output"));
        debug::print(&string::utf8(b""));

        let owner = setup_test();

        // Create different protocol lists
        let protocols_1 = vector::empty<address>();
        vector::push_back(&mut protocols_1, PROTOCOL_1);
        
        let protocols_2 = vector::empty<address>();
        vector::push_back(&mut protocols_2, PROTOCOL_2);
        
        let protocols_both = vector::empty<address>();
        vector::push_back(&mut protocols_both, PROTOCOL_1);
        vector::push_back(&mut protocols_both, PROTOCOL_2);

        print_subsection_header(string::utf8(b"STEP 1: Creating Multiple Test Agents"));

        // Create Agent 1: Trading agent with risk level 5
        create_test_agent_with_debug(&owner, 1, 5, true, false, true, 10000, protocols_1);

        // Create Agent 2: Lending agent with risk level 7
        create_test_agent_with_debug(&owner, 2, 7, false, true, false, 20000, protocols_2);

        // Create Agent 3: Multi-purpose agent with risk level 3
        create_test_agent_with_debug(&owner, 3, 3, true, true, true, 15000, protocols_both);

        // Create Agent 4: High-risk trading agent
        create_test_agent_with_debug(&owner, 4, 9, true, false, false, 25000, protocols_1);

        print_subsection_header(string::utf8(b"STEP 2: Testing Basic View Functions"));

        // Test get_agent_count
        let agent_count = agent_factory::get_agent_count(OWNER);
        print_result(string::utf8(b"Total agent count"), agent_count);

        // Test agent_exists
        print_bool_result(string::utf8(b"Agent 1 exists"), agent_factory::agent_exists(OWNER, 1));
        print_bool_result(string::utf8(b"Agent 5 exists"), agent_factory::agent_exists(OWNER, 5));

        print_subsection_header(string::utf8(b"STEP 3: Testing get_agent_by_id"));

        // Get and display details for each agent
        let agent1 = agent_factory::get_agent_by_id(OWNER, 1);
        print_agent_details(&agent1, string::utf8(b"Agent 1"));
        print_parameters_details(&agent1, string::utf8(b"Agent 1"));
        print_permissions_details(&agent1, string::utf8(b"Agent 1"));
        print_performance_details(&agent1, string::utf8(b"Agent 1"));

        let agent2 = agent_factory::get_agent_by_id(OWNER, 2);
        print_agent_details(&agent2, string::utf8(b"Agent 2"));
        print_permissions_details(&agent2, string::utf8(b"Agent 2"));

        print_subsection_header(string::utf8(b"STEP 4: Testing get_agents_by_owner"));

        let all_agents = agent_factory::get_agents_by_owner(OWNER);
        print_agents_vector(&all_agents, string::utf8(b"All agents for owner"));

        print_subsection_header(string::utf8(b"STEP 5: Testing get_active_agents_by_owner"));

        // Deactivate agent 2
        debug::print(&string::utf8(b"Deactivating Agent 2..."));
        agent_factory::toggle_agent_status(&owner, 2);

        let active_agents = agent_factory::get_active_agents_by_owner(OWNER);
        print_agents_vector(&active_agents, string::utf8(b"Active agents only"));

        print_subsection_header(string::utf8(b"STEP 6: Testing Filtering by Risk Level"));

        let risk_5_agents = agent_factory::get_agents_by_risk_level(OWNER, 5);
        print_agents_vector(&risk_5_agents, string::utf8(b"Agents with risk level 5"));

        let risk_7_agents = agent_factory::get_agents_by_risk_level(OWNER, 7);
        print_agents_vector(&risk_7_agents, string::utf8(b"Agents with risk level 7"));

        let risk_9_agents = agent_factory::get_agents_by_risk_level(OWNER, 9);
        print_agents_vector(&risk_9_agents, string::utf8(b"Agents with risk level 9"));

        print_subsection_header(string::utf8(b"STEP 7: Testing Performance Tracking"));

        // Update performance for agents
        debug::print(&string::utf8(b"Updating performance for Agent 1..."));
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);
        agent_factory::update_agent_performance(&owner, 1, 200, true);

        debug::print(&string::utf8(b"Updating performance for Agent 3..."));
        agent_factory::update_agent_performance(&owner, 3, 300, true);
        agent_factory::update_agent_performance(&owner, 3, 400, true);

        debug::print(&string::utf8(b"Updating performance for Agent 4..."));
        agent_factory::update_agent_performance(&owner, 4, 150, true);

        // Get updated agent 1 and show performance
        let updated_agent1 = agent_factory::get_agent_by_id(OWNER, 1);
        print_performance_details(&updated_agent1, string::utf8(b"Agent 1 (Updated)"));

        print_subsection_header(string::utf8(b"STEP 8: Testing Performance-Based Filtering"));

        let high_performing_agents = agent_factory::get_agents_by_performance_threshold(OWNER, 6000); // 60% win rate
        print_agents_vector(&high_performing_agents, string::utf8(b"High performing agents (>=60% win rate)"));

        let profitable_agents = agent_factory::get_agents_by_profit_threshold(OWNER, 200);
        print_agents_vector(&profitable_agents, string::utf8(b"Profitable agents (>=200 profit)"));

        print_subsection_header(string::utf8(b"STEP 9: Testing Action Type Filtering"));

        let trading_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_trade());
        print_agents_vector(&trading_agents, string::utf8(b"Agents that can trade"));

        let lending_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_lend());
        print_agents_vector(&lending_agents, string::utf8(b"Agents that can lend"));

        let staking_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_stake());
        print_agents_vector(&staking_agents, string::utf8(b"Agents that can stake"));

        print_subsection_header(string::utf8(b"STEP 10: Testing Protocol Filtering"));

        let protocol_1_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_1);
        print_agents_vector(&protocol_1_agents, string::utf8(b"Agents allowed on Protocol 1"));

        let protocol_2_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_2);
        print_agents_vector(&protocol_2_agents, string::utf8(b"Agents allowed on Protocol 2"));

        let protocol_3_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_3);
        print_agents_vector(&protocol_3_agents, string::utf8(b"Agents allowed on Protocol 3 (none expected)"));

        print_subsection_header(string::utf8(b"STEP 11: Testing Emergency Stop"));

        // Emergency stop agent 4
        debug::print(&string::utf8(b"Emergency stopping Agent 4..."));
        agent_factory::emergency_stop_agent(&owner, 4);

        let emergency_agents = agent_factory::get_emergency_stopped_agents(OWNER);
        print_agents_vector(&emergency_agents, string::utf8(b"Emergency stopped agents"));

        print_subsection_header(string::utf8(b"STEP 12: Testing Performance Summary"));

        let (total_agents, active_agents, total_profit, total_trades) = agent_factory::get_agent_performance_summary(OWNER);
        debug::print(&string::utf8(b"Performance Summary:"));
        print_result(string::utf8(b"  Total Agents"), total_agents);
        print_result(string::utf8(b"  Active Agents"), active_agents);
        print_result(string::utf8(b"  Total Profit"), total_profit);
        print_result(string::utf8(b"  Total Trades"), total_trades);

        print_subsection_header(string::utf8(b"STEP 13: Testing Execution Frequency Filtering"));

        let frequent_agents = agent_factory::get_agents_by_execution_frequency(OWNER, 4000);
        print_agents_vector(&frequent_agents, string::utf8(b"Agents with execution frequency <= 4000"));

        let very_frequent_agents = agent_factory::get_agents_by_execution_frequency(OWNER, 1000);
        print_agents_vector(&very_frequent_agents, string::utf8(b"Agents with execution frequency <= 1000"));

        print_subsection_header(string::utf8(b"STEP 14: Testing Value Managed Filtering"));

        let high_value_agents = agent_factory::get_agents_by_value_managed(OWNER, 1);
        print_agents_vector(&high_value_agents, string::utf8(b"Agents with value managed >= 1"));

        let all_value_agents = agent_factory::get_agents_by_value_managed(OWNER, 0);
        print_agents_vector(&all_value_agents, string::utf8(b"All agents (value managed >= 0)"));

        print_subsection_header(string::utf8(b"STEP 15: Testing get_all_agents"));

        let global_agents = agent_factory::get_all_agents();
        print_agents_vector(&global_agents, string::utf8(b"Global agents (currently empty)"));

        print_section_header(string::utf8(b"DEBUG VIEW FUNCTIONS FLOW TEST COMPLETED"));
        debug::print(&string::utf8(b"All view functions tested successfully!"));
        debug::print(&string::utf8(b""));
    }

    #[test]
    fun test_debug_event_flow() {
        print_section_header(string::utf8(b"DEBUG EVENT FLOW TEST"));
        debug::print(&string::utf8(b"Testing event emission and tracking"));
        debug::print(&string::utf8(b""));

        let owner = setup_test();
        let protocols = vector::empty<address>();
        vector::push_back(&mut protocols, PROTOCOL_1);

        print_subsection_header(string::utf8(b"Creating Agent and Tracking Events"));
        
        // Create agent
        create_test_agent_with_debug(&owner, 1, 5, true, false, true, 10000, protocols);

        // Check creation event
        let events = event::emitted_events<agent_factory::AgentCreatedEvent>();
        print_result(string::utf8(b"Number of creation events"), vector::length(&events));
        
        if (vector::length(&events) > 0) {
            let event = vector::borrow(&events, 0);
            debug::print(&string::utf8(b"Creation Event Details:"));
            print_result(string::utf8(b"  Agent ID"), agent_factory::get_agent_created_event_id(event));
            print_address_result(string::utf8(b"  Owner"), agent_factory::get_agent_created_event_owner(event));
            print_result(string::utf8(b"  Risk Level"), (agent_factory::get_agent_created_event_risk_level(event) as u64));
        };

        print_subsection_header(string::utf8(b"Updating Performance and Tracking Events"));
        
        // Update performance
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);

        let perf_events = event::emitted_events<agent_factory::AgentPerformanceUpdatedEvent>();
        print_result(string::utf8(b"Number of performance events"), vector::length(&perf_events));

        print_subsection_header(string::utf8(b"Toggling Status and Tracking Events"));
        
        // Toggle status
        agent_factory::toggle_agent_status(&owner, 1);

        let status_events = event::emitted_events<agent_factory::AgentStatusChangedEvent>();
        print_result(string::utf8(b"Number of status change events"), vector::length(&status_events));

        if (vector::length(&status_events) > 0) {
            let event = vector::borrow(&status_events, 0);
            debug::print(&string::utf8(b"Status Change Event Details:"));
            print_result(string::utf8(b"  Agent ID"), agent_factory::get_agent_status_changed_event_id(event));
            print_bool_result(string::utf8(b"  Is Active"), agent_factory::get_agent_status_changed_event_is_active(event));
        };

        print_section_header(string::utf8(b"DEBUG EVENT FLOW TEST COMPLETED"));
        debug::print(&string::utf8(b""));
    }

    #[test]
    fun test_debug_action_request_flow() {
        print_section_header(string::utf8(b"DEBUG ACTION REQUEST FLOW TEST"));
        debug::print(&string::utf8(b"Testing action request validation and events"));
        debug::print(&string::utf8(b""));

        let owner = setup_test();
        let protocols = vector::empty<address>();
        vector::push_back(&mut protocols, PROTOCOL_1);

        print_subsection_header(string::utf8(b"Creating Trading Agent"));
        create_test_agent_with_debug(&owner, 1, 5, true, false, true, 10000, protocols);

        print_subsection_header(string::utf8(b"Requesting Valid Trading Action"));
        
        // Request valid action
        agent_factory::request_agent_action(
            &owner,
            1, // agent_id
            agent_factory::get_action_trade(),
            PROTOCOL_1,
            5000, // amount within limit
        );

        let action_events = event::emitted_events<agent_factory::AgentActionRequestedEvent>();
        print_result(string::utf8(b"Number of action request events"), vector::length(&action_events));

        if (vector::length(&action_events) > 0) {
            let event = vector::borrow(&action_events, 0);
            debug::print(&string::utf8(b"Action Request Event Details:"));
            print_result(string::utf8(b"  Agent ID"), agent_factory::get_agent_action_requested_event_id(event));
            print_result(string::utf8(b"  Action Type"), (agent_factory::get_agent_action_requested_event_action_type(event) as u64));
            print_address_result(string::utf8(b"  Protocol"), agent_factory::get_agent_action_requested_event_protocol(event));
            print_result(string::utf8(b"  Amount"), agent_factory::get_agent_action_requested_event_amount(event));
        };

        print_section_header(string::utf8(b"DEBUG ACTION REQUEST FLOW TEST COMPLETED"));
        debug::print(&string::utf8(b""));
    }
}
