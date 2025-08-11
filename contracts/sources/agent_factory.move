module deployer_addr::AgentFactory {
    use std::signer;
    use std::table;
    use std::vector;
    use aptos_framework::event;

    const E_ACTION_NOT_ALLOWED: u64 = 1001;
    const E_PROTOCOL_NOT_ALLOWED: u64 = 1002;
    const E_AMOUNT_EXCEEDS_LIMIT: u64 = 1003;
    const E_AGENT_NOT_FOUND: u64 = 1004;
    const E_INVALID_RISK_LEVEL: u64 = 1005;
    const E_INVALID_PARAMETERS: u64 = 1006;
    const E_NOT_OWNER: u64 = 1007;
    const E_RESOURCE_NOT_EXISTS: u64 = 1008;

    // Action types
    const ACTION_TRADE: u8 = 1;
    const ACTION_LEND: u8 = 2;
    const ACTION_STAKE: u8 = 3;

    // Risk level constants
    const MIN_RISK_LEVEL: u8 = 1;
    const MAX_RISK_LEVEL: u8 = 10;

    // Public getters for action types
    public fun get_action_trade(): u8 { ACTION_TRADE }
    public fun get_action_lend(): u8 { ACTION_LEND }
    public fun get_action_stake(): u8 { ACTION_STAKE }

    // Core struct: Agent
    struct Agent has key, store, copy, drop {
        id: u64,
        owner: address,
        strategy_code: vector<u8>,
        parameters: AgentParams,
        performance: PerformanceMetrics,
        permissions: AgentPermissions,
        last_execution: u64,
        total_value_managed: u64,
        is_active: bool,
        created_at: u64,
    }

    struct AgentParams has store, copy, drop {
        risk_level: u8,          // 1-10 risk scale
        max_slippage: u64,       // Maximum acceptable slippage
        stop_loss: u64,          // Stop loss percentage
        target_profit: u64,      // Target profit percentage
        execution_frequency: u64, // Execution interval in seconds
        max_gas_per_tx: u64,     // Gas limit per transaction
    }

    struct PerformanceMetrics has store, copy, drop {
        total_trades: u64,
        successful_trades: u64,
        total_profit: u64,
        total_loss: u64,
        avg_return: u64,
        sharpe_ratio: u64,
        max_drawdown: u64,
        win_rate: u64,
    }

    struct AgentPermissions has store, copy, drop {
        can_trade: bool,
        can_lend: bool,
        can_stake: bool,
        max_amount_per_tx: u64,
        allowed_protocols: vector<address>,
        emergency_stop: bool,
    }

    #[event]
    struct AgentCreatedEvent has drop, store {
        id: u64,
        owner: address,
        risk_level: u8,
        created_at: u64,
    }

    #[event]
    struct AgentActionRequestedEvent has drop, store {
        id: u64,
        owner: address,
        action_type: u8,
        protocol: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct AgentPerformanceUpdatedEvent has drop, store {
        id: u64,
        owner: address,
        profit: u64,
        success: bool,
        timestamp: u64,
    }

    #[event]
    struct AgentStatusChangedEvent has drop, store {
        id: u64,
        owner: address,
        is_active: bool,
        timestamp: u64,
    }

    // Per-owner storage of agents and id counter
    struct OwnerAgents has key {
        agents: table::Table<u64, Agent>,
        next_id: u64,
    }

    // Global statistics (commented out for now - will be implemented in production)
    // struct GlobalStats has key {
    //     total_agents_created: u64,
    //     total_value_locked: u64,
    //     total_trades_executed: u64,
    // }

    // Ensure the owner resource exists; if not, create it
    fun ensure_owner_storage(account: &signer) {
        let owner = signer::address_of(account);
        if (!exists<OwnerAgents>(owner)) {
            move_to(account, OwnerAgents { agents: table::new<u64, Agent>(), next_id: 1 });
        }
    }

    // Initialize global stats if not exists (commented out for now)
    // fun ensure_global_stats() {
    //     if (!exists<GlobalStats>(@agent_factory)) {
    //         // For now, we'll initialize this in the module initialization
    //         // In production, this would be done during module deployment
    //     }
    // }

    // Validate agent parameters
    fun validate_agent_params(
        risk_level: u8,
        max_slippage: u64,
        stop_loss: u64,
        target_profit: u64,
        execution_frequency: u64,
        max_gas_per_tx: u64,
    ): bool {
        // Validate risk level
        if (risk_level < MIN_RISK_LEVEL || risk_level > MAX_RISK_LEVEL) {
            return false
        };
        
        // Validate max slippage (assuming it's in basis points, max 50%)
        if (max_slippage > 5000) {
            return false
        };
        
        // Validate percentages (assuming they're in basis points)
        if (stop_loss > 10000 || target_profit > 10000) {
            return false
        };
        
        // Validate execution frequency (minimum 1 minute)
        if (execution_frequency < 60) {
            return false
        };
        
        // Validate gas limit (reasonable bounds)
        if (max_gas_per_tx < 100000 || max_gas_per_tx > 10000000) {
            return false
        };
        
        true
    }

    // Create a new agent (entry; no return). Emits event; stores under caller's resource
    public entry fun create_agent(
        account: &signer,
        strategy_code: vector<u8>,
        risk_level: u8,
        max_slippage: u64,
        stop_loss: u64,
        target_profit: u64,
        execution_frequency: u64,
        max_gas_per_tx: u64,
        can_trade: bool,
        can_lend: bool,
        can_stake: bool,
        max_amount_per_tx: u64,
        allowed_protocols: vector<address>,
    ) acquires OwnerAgents {
        // Validate parameters
        assert!(validate_agent_params(risk_level, max_slippage, stop_loss, target_profit, execution_frequency, max_gas_per_tx), E_INVALID_PARAMETERS);
        
        ensure_owner_storage(account);
        
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        let id = store.next_id;
        store.next_id = id + 1;
        
        let agent = Agent {
            id,
            owner,
            strategy_code,
            parameters: AgentParams {
                risk_level,
                max_slippage,
                stop_loss,
                target_profit,
                execution_frequency,
                max_gas_per_tx,
            },
            performance: PerformanceMetrics {
                total_trades: 0,
                successful_trades: 0,
                total_profit: 0,
                total_loss: 0,
                avg_return: 0,
                sharpe_ratio: 0,
                max_drawdown: 0,
                win_rate: 0,
            },
            permissions: AgentPermissions {
                can_trade,
                can_lend,
                can_stake,
                max_amount_per_tx,
                allowed_protocols,
                emergency_stop: false,
            },
            last_execution: 0,
            total_value_managed: 0,
            is_active: true,
            created_at: 0, // Will be set in production
        };
        
        table::add(&mut store.agents, id, agent);
        
        event::emit<AgentCreatedEvent>(AgentCreatedEvent { 
            id, 
            owner, 
            risk_level, 
            created_at: 0 // Will be set in production
        });
    }

    // Validate and request an action (entry; no return). Emits event if permitted.
    public entry fun request_agent_action(
        account: &signer,
        agent_id: u64,
        action_type: u8,
        protocol: address,
        amount: u64,
    ) acquires OwnerAgents {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        
        // Check if agent exists
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        
        let agent_ref = table::borrow_mut(&mut store.agents, agent_id);
        
        // Check if agent is active
        assert!(agent_ref.is_active, E_ACTION_NOT_ALLOWED);
        
        // Check emergency stop
        assert!(!agent_ref.permissions.emergency_stop, E_ACTION_NOT_ALLOWED);

        // Action permission
        if (action_type == ACTION_TRADE) {
            assert!(agent_ref.permissions.can_trade, E_ACTION_NOT_ALLOWED);
        } else if (action_type == ACTION_LEND) {
            assert!(agent_ref.permissions.can_lend, E_ACTION_NOT_ALLOWED);
        } else if (action_type == ACTION_STAKE) {
            assert!(agent_ref.permissions.can_stake, E_ACTION_NOT_ALLOWED);
        } else {
            // Unknown action type
            assert!(false, E_ACTION_NOT_ALLOWED);
        };

        // Amount limit
        assert!(amount <= agent_ref.permissions.max_amount_per_tx, E_AMOUNT_EXCEEDS_LIMIT);

        // Protocol allowlist
        assert!(contains_address(&agent_ref.permissions.allowed_protocols, protocol), E_PROTOCOL_NOT_ALLOWED);
        
        event::emit<AgentActionRequestedEvent>(AgentActionRequestedEvent {
            id: agent_id,
            owner,
            action_type,
            protocol,
            amount,
            timestamp: 0, // Will be set in production
        });
    }

    // Execute agent strategy (entry; no return). Only owner can execute.
    public entry fun execute_agent_strategy(account: &signer, agent_id: u64) acquires OwnerAgents {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        
        // Check if agent exists
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        
        let agent_ref = table::borrow_mut(&mut store.agents, agent_id);
        
        // Check if agent is active
        assert!(agent_ref.is_active, E_ACTION_NOT_ALLOWED);
        
        // Ownership guaranteed by storage location
        agent_ref.last_execution = 1; // Simple flag for testing, will use timestamp in production
    }

    // Update performance (entry; no return). Only owner can update their agent.
    public entry fun update_agent_performance(
        account: &signer, 
        agent_id: u64, 
        profit: u64, 
        success: bool
    ) acquires OwnerAgents {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        
        // Check if agent exists
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        
        let agent_ref = table::borrow_mut(&mut store.agents, agent_id);
        
        agent_ref.performance.total_trades = agent_ref.performance.total_trades + 1;
        
        if (success) {
            agent_ref.performance.successful_trades = agent_ref.performance.successful_trades + 1;
            agent_ref.performance.total_profit = agent_ref.performance.total_profit + profit;
        } else {
            agent_ref.performance.total_loss = agent_ref.performance.total_loss + profit;
        };
        
        // Update win rate
        agent_ref.performance.win_rate = (agent_ref.performance.successful_trades * 10000) / agent_ref.performance.total_trades;
        
        // Update average return
        let total_trades = agent_ref.performance.total_trades;
        if (total_trades > 0) {
            agent_ref.performance.avg_return = (agent_ref.performance.total_profit + agent_ref.performance.total_loss) / total_trades;
        };
        
        event::emit<AgentPerformanceUpdatedEvent>(AgentPerformanceUpdatedEvent {
            id: agent_id,
            owner,
            profit,
            success,
            timestamp: 0, // Will be set in production
        });
    }

    // Toggle agent active status
    public entry fun toggle_agent_status(account: &signer, agent_id: u64) acquires OwnerAgents {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        
        // Check if agent exists
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        
        let agent_ref = table::borrow_mut(&mut store.agents, agent_id);
        agent_ref.is_active = !agent_ref.is_active;
        
        event::emit<AgentStatusChangedEvent>(AgentStatusChangedEvent {
            id: agent_id,
            owner,
            is_active: agent_ref.is_active,
            timestamp: 0, // Will be set in production
        });
    }

    // Emergency stop for agent
    public entry fun emergency_stop_agent(account: &signer, agent_id: u64) acquires OwnerAgents {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<OwnerAgents>(owner);
        
        // Check if agent exists
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        
        let agent_ref = table::borrow_mut(&mut store.agents, agent_id);
        agent_ref.permissions.emergency_stop = true;
        agent_ref.is_active = false;
        
        event::emit<AgentStatusChangedEvent>(AgentStatusChangedEvent {
            id: agent_id,
            owner,
            is_active: false,
            timestamp: 0, // Will be set in production
        });
    }

    // READ FUNCTIONS - Public getters for agent data

    #[view]
    public fun get_agent_by_id(owner: address, agent_id: u64): Agent acquires OwnerAgents {
        assert!(exists<OwnerAgents>(owner), E_AGENT_NOT_FOUND);
        let store = borrow_global<OwnerAgents>(owner);
        assert!(table::contains(&store.agents, agent_id), E_AGENT_NOT_FOUND);
        *table::borrow(&store.agents, agent_id)
    }

    #[view]
    public fun get_agents_by_owner(owner: address): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let owner_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                vector::push_back(&mut owner_agents, *agent_ref);
            };
            counter = counter + 1;
        };
        owner_agents
    }

    #[view]
    public fun get_all_agents(): vector<Agent> {
        // Note: This would require a different storage pattern for global access
        // For now, returning empty vector as this would need global storage
        vector::empty<Agent>()
    }

    #[view]
    public fun get_active_agents_by_owner(owner: address): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let active_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.is_active) {
                    vector::push_back(&mut active_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        active_agents
    }

    #[view]
    public fun get_agents_by_risk_level(owner: address, risk_level: u8): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let matching_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.parameters.risk_level == risk_level) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        matching_agents
    }

    #[view]
    public fun get_agent_count(owner: address): u64 acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return 0
        };
        let store = borrow_global<OwnerAgents>(owner);
        store.next_id - 1
    }

    #[view]
    public fun agent_exists(owner: address, agent_id: u64): bool acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return false
        };
        let store = borrow_global<OwnerAgents>(owner);
        table::contains(&store.agents, agent_id)
    }

    #[view]
    public fun get_agents_by_performance_threshold(owner: address, min_win_rate: u64): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let high_performing_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.performance.win_rate >= min_win_rate) {
                    vector::push_back(&mut high_performing_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        high_performing_agents
    }

    #[view]
    public fun get_agents_by_profit_threshold(owner: address, min_profit: u64): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let profitable_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.performance.total_profit >= min_profit) {
                    vector::push_back(&mut profitable_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        profitable_agents
    }

    #[view]
    public fun get_agents_by_action_type(owner: address, action_type: u8): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let matching_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (action_type == ACTION_TRADE && agent_ref.permissions.can_trade) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                } else if (action_type == ACTION_LEND && agent_ref.permissions.can_lend) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                } else if (action_type == ACTION_STAKE && agent_ref.permissions.can_stake) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        matching_agents
    }

    #[view]
    public fun get_agents_by_protocol(owner: address, protocol: address): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let matching_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (contains_address(&agent_ref.permissions.allowed_protocols, protocol)) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        matching_agents
    }

    #[view]
    public fun get_agents_by_execution_frequency(owner: address, max_frequency: u64): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let matching_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.parameters.execution_frequency <= max_frequency) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        matching_agents
    }

    #[view]
    public fun get_agents_by_value_managed(owner: address, min_value: u64): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let matching_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.total_value_managed >= min_value) {
                    vector::push_back(&mut matching_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        matching_agents
    }

    #[view]
    public fun get_emergency_stopped_agents(owner: address): vector<Agent> acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return vector::empty<Agent>()
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let emergency_agents = vector::empty<Agent>();
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                if (agent_ref.permissions.emergency_stop) {
                    vector::push_back(&mut emergency_agents, *agent_ref);
                };
            };
            counter = counter + 1;
        };
        emergency_agents
    }

    #[view]
    public fun get_agent_performance_summary(owner: address): (u64, u64, u64, u64) acquires OwnerAgents {
        if (!exists<OwnerAgents>(owner)) {
            return (0, 0, 0, 0)
        };
        
        let store = borrow_global<OwnerAgents>(owner);
        let total_agents = 0;
        let active_agents = 0;
        let total_profit = 0;
        let total_trades = 0;
        
        let counter = 0;
        while (counter < store.next_id) {
            if (table::contains(&store.agents, counter)) {
                let agent_ref = table::borrow(&store.agents, counter);
                total_agents = total_agents + 1;
                if (agent_ref.is_active) {
                    active_agents = active_agents + 1;
                };
                total_profit = total_profit + agent_ref.performance.total_profit;
                total_trades = total_trades + agent_ref.performance.total_trades;
            };
            counter = counter + 1;
        };
        (total_agents, active_agents, total_profit, total_trades)
    }

    // Public getters for Agent struct fields
    public fun get_agent_last_execution(agent: &Agent): u64 { agent.last_execution }
    public fun get_agent_is_active(agent: &Agent): bool { agent.is_active }
    public fun get_agent_owner(agent: &Agent): address { agent.owner }
    public fun get_agent_id(agent: &Agent): u64 { agent.id }
    public fun get_agent_created_at(agent: &Agent): u64 { agent.created_at }
    public fun get_agent_total_value_managed(agent: &Agent): u64 { agent.total_value_managed }
    public fun get_agent_parameters(agent: &Agent): &AgentParams { &agent.parameters }
    public fun get_agent_permissions(agent: &Agent): &AgentPermissions { &agent.permissions }
    public fun get_agent_performance(agent: &Agent): &PerformanceMetrics { &agent.performance }
    
    // Public getters for AgentParams
    public fun get_agent_params_risk_level(params: &AgentParams): u8 { params.risk_level }
    public fun get_agent_params_max_slippage(params: &AgentParams): u64 { params.max_slippage }
    public fun get_agent_params_stop_loss(params: &AgentParams): u64 { params.stop_loss }
    public fun get_agent_params_target_profit(params: &AgentParams): u64 { params.target_profit }
    public fun get_agent_params_execution_frequency(params: &AgentParams): u64 { params.execution_frequency }
    public fun get_agent_params_max_gas_per_tx(params: &AgentParams): u64 { params.max_gas_per_tx }
    
    // Public getters for PerformanceMetrics
    public fun get_performance_total_trades(perf: &PerformanceMetrics): u64 { perf.total_trades }
    public fun get_performance_successful_trades(perf: &PerformanceMetrics): u64 { perf.successful_trades }
    public fun get_performance_total_profit(perf: &PerformanceMetrics): u64 { perf.total_profit }
    public fun get_performance_total_loss(perf: &PerformanceMetrics): u64 { perf.total_loss }
    public fun get_performance_avg_return(perf: &PerformanceMetrics): u64 { perf.avg_return }
    public fun get_performance_sharpe_ratio(perf: &PerformanceMetrics): u64 { perf.sharpe_ratio }
    public fun get_performance_max_drawdown(perf: &PerformanceMetrics): u64 { perf.max_drawdown }
    public fun get_performance_win_rate(perf: &PerformanceMetrics): u64 { perf.win_rate }
    
    // Public getters for AgentPermissions
    public fun get_permissions_can_trade(perms: &AgentPermissions): bool { perms.can_trade }
    public fun get_permissions_can_lend(perms: &AgentPermissions): bool { perms.can_lend }
    public fun get_permissions_can_stake(perms: &AgentPermissions): bool { perms.can_stake }
    public fun get_permissions_max_amount_per_tx(perms: &AgentPermissions): u64 { perms.max_amount_per_tx }
    public fun get_permissions_emergency_stop(perms: &AgentPermissions): bool { perms.emergency_stop }

    // Helper: vector contains address
    fun contains_address(vec: &vector<address>, addr: address): bool {
        let i = 0;
        let n = vector::length(vec);
        while (i < n) {
            let a = *vector::borrow(vec, i);
            if (a == addr) { return true };
            i = i + 1;
        };
        false
    }

    // Public getters for event fields
    public fun get_agent_created_event_id(event: &AgentCreatedEvent): u64 { event.id }
    public fun get_agent_created_event_owner(event: &AgentCreatedEvent): address { event.owner }
    public fun get_agent_created_event_risk_level(event: &AgentCreatedEvent): u8 { event.risk_level }
    public fun get_agent_created_event_created_at(event: &AgentCreatedEvent): u64 { event.created_at }
    
    public fun get_agent_action_requested_event_id(event: &AgentActionRequestedEvent): u64 { event.id }
    public fun get_agent_action_requested_event_owner(event: &AgentActionRequestedEvent): address { event.owner }
    public fun get_agent_action_requested_event_action_type(event: &AgentActionRequestedEvent): u8 { event.action_type }
    public fun get_agent_action_requested_event_protocol(event: &AgentActionRequestedEvent): address { event.protocol }
    public fun get_agent_action_requested_event_amount(event: &AgentActionRequestedEvent): u64 { event.amount }
    public fun get_agent_action_requested_event_timestamp(event: &AgentActionRequestedEvent): u64 { event.timestamp }
    
    public fun get_agent_performance_updated_event_id(event: &AgentPerformanceUpdatedEvent): u64 { event.id }
    public fun get_agent_performance_updated_event_owner(event: &AgentPerformanceUpdatedEvent): address { event.owner }
    public fun get_agent_performance_updated_event_profit(event: &AgentPerformanceUpdatedEvent): u64 { event.profit }
    public fun get_agent_performance_updated_event_success(event: &AgentPerformanceUpdatedEvent): bool { event.success }
    public fun get_agent_performance_updated_event_timestamp(event: &AgentPerformanceUpdatedEvent): u64 { event.timestamp }
    
    public fun get_agent_status_changed_event_id(event: &AgentStatusChangedEvent): u64 { event.id }
    public fun get_agent_status_changed_event_owner(event: &AgentStatusChangedEvent): address { event.owner }
    public fun get_agent_status_changed_event_is_active(event: &AgentStatusChangedEvent): bool { event.is_active }
    public fun get_agent_status_changed_event_timestamp(event: &AgentStatusChangedEvent): u64 { event.timestamp }
}