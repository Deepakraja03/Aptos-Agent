#[test_only]
module deployer_addr::agent_factory_tests {
    use std::vector;
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
        // Create deployer and initialize the module (owner-only)
        let deployer = account::create_account_for_test(@deployer_addr);
        agent_factory::initialize(&deployer);

        // Create a separate owner account used in tests
        let owner = account::create_account_for_test(OWNER);
        owner
    }

    // Test successful initialization
    #[test]
    fun test_initialize_success() {
        let deployer = account::create_account_for_test(@deployer_addr);
        agent_factory::initialize(&deployer);
        
        // Verify that the deployer can now create agents
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);
        
        create_test_agent(&deployer, 1, 5, true, false, true, 10000, allowed_protocols);
        
        // Verify agent was created successfully
        assert!(agent_factory::agent_exists(@deployer_addr, 1), 0);
        assert!(agent_factory::get_agent_count(@deployer_addr) == 1, 1);
    }

    // Ensure initialize is owner-only
    #[test]
    #[expected_failure(abort_code = agent_factory::E_RESOURCE_NOT_EXISTS)]
    fun test_initialize_must_be_deployer() {
        let owner = account::create_account_for_test(OWNER);
        agent_factory::initialize(&owner);
    }
    
    // Test that initialize can be called multiple times without failing
    #[test]
    fun test_initialize_idempotent() {
        let deployer = account::create_account_for_test(@deployer_addr);
        
        // Call initialize multiple times - should not fail
        agent_factory::initialize(&deployer);
        agent_factory::initialize(&deployer);
        agent_factory::initialize(&deployer);
        
        // Should still work normally
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);
        
        create_test_agent(&deployer, 1, 5, true, false, true, 10000, allowed_protocols);
        assert!(agent_factory::agent_exists(@deployer_addr, 1), 2);
    }

    // Helper function to create a test agent
    fun create_test_agent(
        owner: &signer,
        _agent_id: u64,
        risk_level: u8,
        can_trade: bool,
        can_lend: bool,
        can_stake: bool,
        max_amount: u64,
        protocols: vector<address>,
    ) {
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
    }

    #[test]
    fun test_create_agent() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Verify agent was created (check event)
        let events = event::emitted_events<agent_factory::AgentCreatedEvent>();
        assert!(vector::length(&events) == 1, 0);
        let event = vector::borrow(&events, 0);
        assert!(agent_factory::get_agent_created_event_id(event) == 1, 1);
        assert!(agent_factory::get_agent_created_event_owner(event) == OWNER, 2);
        assert!(agent_factory::get_agent_created_event_risk_level(event) == 5, 3);

        // Test read functions
        assert!(agent_factory::agent_exists(OWNER, 1), 4);
        assert!(agent_factory::get_agent_count(OWNER) == 1, 5);
    }

    #[test]
    fun test_get_agent_by_id() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Test get_agent_by_id
        let agent = agent_factory::get_agent_by_id(OWNER, 1);
        assert!(agent_factory::get_agent_id(&agent) == 1, 6);
        assert!(agent_factory::get_agent_owner(&agent) == OWNER, 7);
        assert!(agent_factory::get_agent_is_active(&agent), 8);
        
        // Test agent parameters - using public getters
        let params = agent_factory::get_agent_parameters(&agent);
        assert!(agent_factory::get_agent_params_risk_level(params) == 5, 9);
        assert!(agent_factory::get_agent_params_max_slippage(params) == 100, 10);
        assert!(agent_factory::get_agent_params_stop_loss(params) == 500, 11);
        assert!(agent_factory::get_agent_params_target_profit(params) == 1000, 12);
        assert!(agent_factory::get_agent_params_execution_frequency(params) == 3600, 13);
        assert!(agent_factory::get_agent_params_max_gas_per_tx(params) == 1000000, 14);

        // Test permissions - using public getters
        let perms = agent_factory::get_agent_permissions(&agent);
        assert!(agent_factory::get_permissions_can_trade(perms), 15);
        assert!(!agent_factory::get_permissions_can_lend(perms), 16);
        assert!(agent_factory::get_permissions_can_stake(perms), 17);
        assert!(agent_factory::get_permissions_max_amount_per_tx(perms) == 10000, 18);
        assert!(!agent_factory::get_permissions_emergency_stop(perms), 19);

        // Test performance metrics - using public getters
        let perf = agent_factory::get_agent_performance(&agent);
        assert!(agent_factory::get_performance_total_trades(perf) == 0, 20);
        assert!(agent_factory::get_performance_successful_trades(perf) == 0, 21);
        assert!(agent_factory::get_performance_total_profit(perf) == 0, 22);
        assert!(agent_factory::get_performance_total_loss(perf) == 0, 23);
        assert!(agent_factory::get_performance_avg_return(perf) == 0, 24);
        assert!(agent_factory::get_performance_sharpe_ratio(perf) == 0, 25);
        assert!(agent_factory::get_performance_max_drawdown(perf) == 0, 26);
        assert!(agent_factory::get_performance_win_rate(perf) == 0, 27);
    }

    #[test]
    fun test_get_agents_by_owner() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create multiple agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Test get_agents_by_owner
        let agents = agent_factory::get_agents_by_owner(OWNER);
        assert!(vector::length(&agents) == 3, 28);

        // Verify agent IDs
        let agent1 = vector::borrow(&agents, 0);
        let agent2 = vector::borrow(&agents, 1);
        let agent3 = vector::borrow(&agents, 2);
        assert!(agent_factory::get_agent_id(agent1) == 1, 29);
        assert!(agent_factory::get_agent_id(agent2) == 2, 30);
        assert!(agent_factory::get_agent_id(agent3) == 3, 31);
    }

    #[test]
    fun test_get_active_agents_by_owner() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create multiple agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Deactivate agent 2
        agent_factory::toggle_agent_status(&owner, 2);

        // Test get_active_agents_by_owner
        let active_agents = agent_factory::get_active_agents_by_owner(OWNER);
        assert!(vector::length(&active_agents) == 2, 32);

        // Verify only active agents are returned
        let agent1 = vector::borrow(&active_agents, 0);
        let agent2 = vector::borrow(&active_agents, 1);
        assert!(agent_factory::get_agent_is_active(agent1), 33);
        assert!(agent_factory::get_agent_is_active(agent2), 34);
    }

    #[test]
    fun test_get_agents_by_risk_level() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents with different risk levels
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 5, true, true, true, 15000, allowed_protocols);
        create_test_agent(&owner, 4, 9, false, false, true, 25000, allowed_protocols);

        // Test get_agents_by_risk_level for risk level 5
        let risk_5_agents = agent_factory::get_agents_by_risk_level(OWNER, 5);
        assert!(vector::length(&risk_5_agents) == 2, 35);

        // Test get_agents_by_risk_level for risk level 7
        let risk_7_agents = agent_factory::get_agents_by_risk_level(OWNER, 7);
        assert!(vector::length(&risk_7_agents) == 1, 36);

        // Test get_agents_by_risk_level for risk level 9
        let risk_9_agents = agent_factory::get_agents_by_risk_level(OWNER, 9);
        assert!(vector::length(&risk_9_agents) == 1, 37);

        // Test get_agents_by_risk_level for non-existent risk level
        let risk_10_agents = agent_factory::get_agents_by_risk_level(OWNER, 10);
        assert!(vector::length(&risk_10_agents) == 0, 38);
    }

    #[test]
    fun test_get_agents_by_performance_threshold() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Update performance to create different win rates
        // Agent 1: 2/3 trades successful = 66.67% win rate
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);
        agent_factory::update_agent_performance(&owner, 1, 200, true);

        // Agent 2: 1/2 trades successful = 50% win rate
        agent_factory::update_agent_performance(&owner, 2, 100, true);
        agent_factory::update_agent_performance(&owner, 2, 50, false);

        // Agent 3: 3/3 trades successful = 100% win rate
        agent_factory::update_agent_performance(&owner, 3, 100, true);
        agent_factory::update_agent_performance(&owner, 3, 200, true);
        agent_factory::update_agent_performance(&owner, 3, 300, true);

        // Test get_agents_by_performance_threshold with 60% threshold (6000 basis points)
        let high_performing_agents = agent_factory::get_agents_by_performance_threshold(OWNER, 6000);
        assert!(vector::length(&high_performing_agents) == 2, 39);

        // Test get_agents_by_performance_threshold with 80% threshold (8000 basis points)
        let very_high_performing_agents = agent_factory::get_agents_by_performance_threshold(OWNER, 8000);
        assert!(vector::length(&very_high_performing_agents) == 1, 40);
    }

    #[test]
    fun test_get_agents_by_profit_threshold() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Update performance with different profit levels
        agent_factory::update_agent_performance(&owner, 1, 100, true);  // 100 profit
        agent_factory::update_agent_performance(&owner, 2, 500, true);  // 500 profit
        agent_factory::update_agent_performance(&owner, 3, 1000, true); // 1000 profit

        // Test get_agents_by_profit_threshold with 200 profit threshold
        let profitable_agents = agent_factory::get_agents_by_profit_threshold(OWNER, 200);
        assert!(vector::length(&profitable_agents) == 2, 41);

        // Test get_agents_by_profit_threshold with 800 profit threshold
        let very_profitable_agents = agent_factory::get_agents_by_profit_threshold(OWNER, 800);
        assert!(vector::length(&very_profitable_agents) == 1, 42);
    }

    #[test]
    fun test_get_agents_by_action_type() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents with different action permissions
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);   // can trade and stake
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);  // can lend only
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);    // can do all

        // Test get_agents_by_action_type for trading
        let trading_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_trade());
        assert!(vector::length(&trading_agents) == 2, 43);

        // Test get_agents_by_action_type for lending
        let lending_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_lend());
        assert!(vector::length(&lending_agents) == 2, 44);

        // Test get_agents_by_action_type for staking
        let staking_agents = agent_factory::get_agents_by_action_type(OWNER, agent_factory::get_action_stake());
        assert!(vector::length(&staking_agents) == 2, 45);
    }

    #[test]
    fun test_get_agents_by_protocol() {
        let owner = setup_test();
        let protocols_1 = vector::empty<address>();
        vector::push_back(&mut protocols_1, PROTOCOL_1);
        
        let protocols_2 = vector::empty<address>();
        vector::push_back(&mut protocols_2, PROTOCOL_2);
        
        let protocols_both = vector::empty<address>();
        vector::push_back(&mut protocols_both, PROTOCOL_1);
        vector::push_back(&mut protocols_both, PROTOCOL_2);

        // Create agents with different protocol permissions
        create_test_agent(&owner, 1, 5, true, false, true, 10000, protocols_1);     // protocol 1 only
        create_test_agent(&owner, 2, 7, false, true, false, 20000, protocols_2);    // protocol 2 only
        create_test_agent(&owner, 3, 3, true, true, true, 15000, protocols_both);   // both protocols

        // Test get_agents_by_protocol for protocol 1
        let protocol_1_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_1);
        assert!(vector::length(&protocol_1_agents) == 2, 46);

        // Test get_agents_by_protocol for protocol 2
        let protocol_2_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_2);
        assert!(vector::length(&protocol_2_agents) == 2, 47);

        // Test get_agents_by_protocol for non-existent protocol
        let protocol_3_agents = agent_factory::get_agents_by_protocol(OWNER, PROTOCOL_3);
        assert!(vector::length(&protocol_3_agents) == 0, 48);
    }

    #[test]
    fun test_get_agents_by_execution_frequency() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents with different execution frequencies
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Note: All agents have the same execution_frequency (3600) in create_test_agent
        // So we need to test with a threshold that includes all agents
        let frequent_agents = agent_factory::get_agents_by_execution_frequency(OWNER, 4000);
        assert!(vector::length(&frequent_agents) == 3, 49);

        // Test with a lower threshold that excludes all agents
        let very_frequent_agents = agent_factory::get_agents_by_execution_frequency(OWNER, 1000);
        assert!(vector::length(&very_frequent_agents) == 0, 50);
    }

    #[test]
    fun test_get_agents_by_value_managed() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // All agents start with total_value_managed = 0
        let high_value_agents = agent_factory::get_agents_by_value_managed(OWNER, 1);
        assert!(vector::length(&high_value_agents) == 0, 51);

        // Test with 0 threshold (should include all agents)
        let all_agents = agent_factory::get_agents_by_value_managed(OWNER, 0);
        assert!(vector::length(&all_agents) == 3, 52);
    }

    #[test]
    fun test_get_emergency_stopped_agents() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Emergency stop agent 2
        agent_factory::emergency_stop_agent(&owner, 2);

        // Test get_emergency_stopped_agents
        let emergency_agents = agent_factory::get_emergency_stopped_agents(OWNER);
        assert!(vector::length(&emergency_agents) == 1, 53);

        let emergency_agent = vector::borrow(&emergency_agents, 0);
        assert!(agent_factory::get_agent_id(emergency_agent) == 2, 54);
        let perms = agent_factory::get_agent_permissions(emergency_agent);
        assert!(agent_factory::get_permissions_emergency_stop(perms), 55);
    }

    #[test]
    fun test_get_agent_performance_summary() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Deactivate agent 3
        agent_factory::toggle_agent_status(&owner, 3);

        // Update performance
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 2, 200, true);
        agent_factory::update_agent_performance(&owner, 2, 50, false);

        // Test get_agent_performance_summary
        let (total_agents, active_agents, total_profit, total_trades) = agent_factory::get_agent_performance_summary(OWNER);
        assert!(total_agents == 3, 56);
        assert!(active_agents == 2, 57);
        assert!(total_profit == 300, 58); // 100 + 200
        assert!(total_trades == 3, 59);
    }

    #[test]
    fun test_get_all_agents() {
        // Test get_all_agents (currently returns empty vector)
        let all_agents = agent_factory::get_all_agents();
        assert!(vector::length(&all_agents) == 0, 60);
    }

    #[test]
    fun test_request_agent_action_success() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Request valid action
        agent_factory::request_agent_action(
            &owner,
            1, // agent_id
            agent_factory::get_action_trade(),
            PROTOCOL_1,
            5000, // amount within limit
        );

        // Verify action event was emitted
        let events = event::emitted_events<agent_factory::AgentActionRequestedEvent>();
        assert!(vector::length(&events) == 1, 61);
        let event = vector::borrow(&events, 0);
        assert!(agent_factory::get_agent_action_requested_event_id(event) == 1, 62);
        assert!(agent_factory::get_agent_action_requested_event_action_type(event) == agent_factory::get_action_trade(), 63);
        assert!(agent_factory::get_agent_action_requested_event_protocol(event) == PROTOCOL_1, 64);
        assert!(agent_factory::get_agent_action_requested_event_amount(event) == 5000, 65);
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_ACTION_NOT_ALLOWED)]
    fun test_request_agent_action_not_allowed() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agent with lending disabled
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Try to request lending action (should fail)
        agent_factory::request_agent_action(
            &owner,
            1, // agent_id
            agent_factory::get_action_lend(),
            PROTOCOL_1,
            1000,
        );
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_AMOUNT_EXCEEDS_LIMIT)]
    fun test_request_agent_action_amount_exceeds_limit() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create agent with max_amount_per_tx = 1000
        create_test_agent(&owner, 1, 5, true, false, true, 1000, allowed_protocols);

        // Try to request action with amount > limit (should fail)
        agent_factory::request_agent_action(
            &owner,
            1, // agent_id
            agent_factory::get_action_trade(),
            PROTOCOL_1,
            2000, // amount exceeds limit
        );
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_PROTOCOL_NOT_ALLOWED)]
    fun test_request_agent_action_protocol_not_allowed() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);
        // PROTOCOL_2 not in allowed_protocols

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Try to request action with unauthorized protocol (should fail)
        agent_factory::request_agent_action(
            &owner,
            1, // agent_id
            agent_factory::get_action_trade(),
            PROTOCOL_2, // not in allowed_protocols
            1000,
        );
    }

    #[test]
    fun test_update_agent_performance() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Update performance with success
        agent_factory::update_agent_performance(&owner, 1, 100, true);
        agent_factory::update_agent_performance(&owner, 1, 50, false);
        agent_factory::update_agent_performance(&owner, 1, 200, true);

        // Verify performance events were emitted
        let events = event::emitted_events<agent_factory::AgentPerformanceUpdatedEvent>();
        assert!(vector::length(&events) == 3, 66);

        // Verify performance metrics were updated correctly
        let agent = agent_factory::get_agent_by_id(OWNER, 1);
        let perf = agent_factory::get_agent_performance(&agent);
        assert!(agent_factory::get_performance_total_trades(perf) == 3, 67);
        assert!(agent_factory::get_performance_successful_trades(perf) == 2, 68);
        assert!(agent_factory::get_performance_total_profit(perf) == 300, 69);
        assert!(agent_factory::get_performance_total_loss(perf) == 50, 70);
        assert!(agent_factory::get_performance_win_rate(perf) == 6666, 71); // 2/3 * 10000
    }

    #[test]
    fun test_execute_agent_strategy() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Execute strategy
        agent_factory::execute_agent_strategy(&owner, 1);

        // Verify agent was executed (read function test)
        let agent = agent_factory::get_agent_by_id(OWNER, 1);
        assert!(agent_factory::get_agent_last_execution(&agent) > 0, 72);
    }

    #[test]
    fun test_toggle_agent_status() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Toggle agent status to inactive
        agent_factory::toggle_agent_status(&owner, 1);

        // Verify status change event was emitted
        let events = event::emitted_events<agent_factory::AgentStatusChangedEvent>();
        assert!(vector::length(&events) == 1, 73);
        let event = vector::borrow(&events, 0);
        assert!(!agent_factory::get_agent_status_changed_event_is_active(event), 74);

        // Verify agent is inactive
        let agent = agent_factory::get_agent_by_id(OWNER, 1);
        assert!(!agent_factory::get_agent_is_active(&agent), 75);

        // Toggle back to active
        agent_factory::toggle_agent_status(&owner, 1);
        let agent2 = agent_factory::get_agent_by_id(OWNER, 1);
        assert!(agent_factory::get_agent_is_active(&agent2), 76);
    }

    #[test]
    fun test_emergency_stop_agent() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);

        // Emergency stop agent
        agent_factory::emergency_stop_agent(&owner, 1);

        // Verify status change event was emitted
        let events = event::emitted_events<agent_factory::AgentStatusChangedEvent>();
        assert!(vector::length(&events) == 1, 77);
        let event = vector::borrow(&events, 0);
        assert!(!agent_factory::get_agent_status_changed_event_is_active(event), 78);

        // Verify agent is inactive and emergency stopped
        let agent = agent_factory::get_agent_by_id(OWNER, 1);
        assert!(!agent_factory::get_agent_is_active(&agent), 79);
        let perms = agent_factory::get_agent_permissions(&agent);
        assert!(agent_factory::get_permissions_emergency_stop(perms), 80);
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_INVALID_PARAMETERS)]
    fun test_create_agent_invalid_risk_level() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Try to create agent with invalid risk level (should fail)
        agent_factory::create_agent(
            &owner,
            b"test_strategy",
            15, // invalid risk_level (should be 1-10)
            100, // max_slippage
            500, // stop_loss
            1000, // target_profit
            3600, // execution_frequency
            1000000, // max_gas_per_tx
            true, // can_trade
            false, // can_lend
            true, // can_stake
            10000, // max_amount_per_tx
            allowed_protocols,
        );
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_INVALID_PARAMETERS)]
    fun test_create_agent_invalid_max_slippage() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Try to create agent with invalid max_slippage (should fail)
        agent_factory::create_agent(
            &owner,
            b"test_strategy",
            5, // risk_level
            6000, // invalid max_slippage (should be <= 5000)
            500, // stop_loss
            1000, // target_profit
            3600, // execution_frequency
            1000000, // max_gas_per_tx
            true, // can_trade
            false, // can_lend
            true, // can_stake
            10000, // max_amount_per_tx
            allowed_protocols,
        );
    }

    #[test]
    #[expected_failure(abort_code = agent_factory::E_INVALID_PARAMETERS)]
    fun test_create_agent_invalid_execution_frequency() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Try to create agent with invalid execution_frequency (should fail)
        agent_factory::create_agent(
            &owner,
            b"test_strategy",
            5, // risk_level
            100, // max_slippage
            500, // stop_loss
            1000, // target_profit
            30, // invalid execution_frequency (should be >= 60)
            1000000, // max_gas_per_tx
            true, // can_trade
            false, // can_lend
            true, // can_stake
            10000, // max_amount_per_tx
            allowed_protocols,
        );
    }

    #[test]
    fun test_multiple_agents() {
        let owner = setup_test();
        let allowed_protocols = vector::empty<address>();
        vector::push_back(&mut allowed_protocols, PROTOCOL_1);

        // Create multiple agents
        create_test_agent(&owner, 1, 5, true, false, true, 10000, allowed_protocols);
        create_test_agent(&owner, 2, 7, false, true, false, 20000, allowed_protocols);
        create_test_agent(&owner, 3, 3, true, true, true, 15000, allowed_protocols);

        // Verify all agents were created
        let events = event::emitted_events<agent_factory::AgentCreatedEvent>();
        assert!(vector::length(&events) == 3, 81);
        
        let event1 = vector::borrow(&events, 0);
        let event2 = vector::borrow(&events, 1);
        let event3 = vector::borrow(&events, 2);
        assert!(agent_factory::get_agent_created_event_id(event1) == 1, 82);
        assert!(agent_factory::get_agent_created_event_id(event2) == 2, 83);
        assert!(agent_factory::get_agent_created_event_id(event3) == 3, 84);
        assert!(agent_factory::get_agent_created_event_owner(event1) == OWNER, 85);
        assert!(agent_factory::get_agent_created_event_owner(event2) == OWNER, 86);
        assert!(agent_factory::get_agent_created_event_owner(event3) == OWNER, 87);

        // Test read functions for multiple agents
        assert!(agent_factory::get_agent_count(OWNER) == 3, 88);
        assert!(agent_factory::agent_exists(OWNER, 1), 89);
        assert!(agent_factory::agent_exists(OWNER, 2), 90);
        assert!(agent_factory::agent_exists(OWNER, 3), 91);
        assert!(!agent_factory::agent_exists(OWNER, 4), 92);
    }

    #[test]
    fun test_action_type_constants() {
        // Test action type constants
        assert!(agent_factory::get_action_trade() == 1, 93);
        assert!(agent_factory::get_action_lend() == 2, 94);
        assert!(agent_factory::get_action_stake() == 3, 95);
    }
}
