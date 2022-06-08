//! Network of AudioUnits connected together.

use fundsp::buffer::Buffer;
use fundsp::hacker32::*;
use petgraph::stable_graph::{EdgeIndex, StableGraph};
use petgraph::visit::EdgeRef;
use petgraph::visit::Reversed;
use petgraph::visit::{DfsPostOrder, Visitable};
use petgraph::EdgeDirection::Incoming;

use crate::module::{module, AudioModule32};

pub type PortIndex = usize;
pub type NodeIndex = petgraph::stable_graph::NodeIndex;

const ID: u64 = 62;

#[derive(Clone, Copy)]
pub struct Edge {
    /// Output port.
    pub source: PortIndex,
    /// Input port.
    pub target: PortIndex,
}

/// Create an edge from source to target.
pub fn edge(source: PortIndex, target: PortIndex) -> Edge {
    Edge { source, target }
}

/// Individual AudioUnits are vertices in the graph.
pub struct Node32 {
    /// The unit.
    pub unit: Box<dyn AudioModule32 + Send>,
    /// Input buffers. The length indicates the number of inputs.
    pub input: Buffer<f32>,
    /// Output buffers. The length indicates the number of outputs.
    pub output: Buffer<f32>,
    /// Input for tick iteration. The length indicates the number of inputs.
    pub tick_input: Vec<f32>,
    /// Output for tick iteration. The length indicates the number of outputs.
    pub tick_output: Vec<f32>,
}

impl Node32 {
    pub fn new(unit: Box<dyn AudioModule32 + Send>) -> Self {
        let inputs = unit.inputs();
        let outputs = unit.outputs();

        Self {
            unit,
            input: Buffer::with_size(inputs),
            output: Buffer::with_size(outputs),
            tick_input: vec![0.0; inputs],
            tick_output: vec![0.0; outputs],
        }
    }
    pub fn inputs(&self) -> usize {
        self.input.buffers()
    }

    pub fn outputs(&self) -> usize {
        self.output.buffers()
    }
}

/// Network unit. It can contain other units and maintain connections between them.
/// Outputs of the network are sourced from user specified unit outputs or global inputs.
pub struct Graph32 {
    /// Graph
    graph: StableGraph<Node32, Edge>,
    /// Node representing global output
    global_input: NodeIndex,
    /// Node representing global input
    global_output: NodeIndex,
    visitor: DfsPostOrder<NodeIndex, <StableGraph<Node32, Edge> as Visitable>::Map>,
    sample_rate: f64,
}

impl Graph32 {
    /// Create a new network with the given number of inputs and outputs.
    /// The number of inputs and outputs is fixed after construction.
    pub fn new<I: Size<f32> + Send, O: Size<f32> + Send>() -> Self {
        let mut graph: StableGraph<Node32, Edge> = Default::default();

        let input: An<MultiPass<I, f32>> = An(MultiPass::default());
        let output: An<MultiPass<O, f32>> = An(MultiPass::default());

        let global_input = graph.add_node(Node32::new(Box::new(module(input))));

        let global_output = graph.add_node(Node32::new(Box::new(module(output))));

        Self {
            graph,
            visitor: Default::default(),
            global_input,
            global_output,
            sample_rate: DEFAULT_SR,
        }
    }

    pub fn get_mod_mut(&mut self, id: NodeIndex) -> Option<&mut Node32> {
        self.graph.node_weight_mut(id)
    }

    pub fn get_mod(&mut self, id: NodeIndex) -> Option<&Node32> {
        self.graph.node_weight(id)
    }

    /// Add a new unit to the network. Return its ID handle.
    /// ID handles are always consecutive numbers starting from zero.
    /// The unit is reset with the sample rate of the network.
    pub fn add(&mut self, unit: Box<dyn AudioModule32 + Send>) -> NodeIndex {
        let inputs = unit.inputs();
        let outputs = unit.outputs();

        let node = Node32 {
            unit,
            input: Buffer::with_size(inputs),
            output: Buffer::with_size(outputs),
            tick_input: vec![0.0; inputs],
            tick_output: vec![0.0; outputs],
        };

        self.graph.add_node(node)
    }

    /// Connect the given unit output (`source`, `source_port`)
    /// to the given unit input (`target`, `target_port`).
    pub fn connect(
        &mut self,
        source: NodeIndex,
        source_port: PortIndex,
        target: NodeIndex,
        target_port: PortIndex,
    ) -> EdgeIndex {
        let edge = Edge {
            source: source_port,
            target: target_port,
        };
        self.graph.add_edge(source, target, edge)
    }

    pub fn remove(&mut self, node: NodeIndex) -> bool {
        self.graph.remove_node(node).is_some()
    }

    /// disconnect the given unit output (`source`, `source_port`)
    pub fn disconnect(&mut self, edge: EdgeIndex) -> bool {
        self.graph.remove_edge(edge).is_some()
    }

    /// Connect the node input (`target`, `target_port`)
    /// to the network input `global_input`.
    pub fn connect_input(
        &mut self,
        global_input: PortIndex,
        target: NodeIndex,
        target_port: PortIndex,
    ) -> EdgeIndex {
        let edge = Edge {
            source: global_input,
            target: target_port,
        };
        self.graph.add_edge(self.global_input, target, edge)
    }

    /// Pipe global input to node `target`.
    /// Number of node inputs must match the number of network inputs.
    pub fn pipe_input(&mut self, target: NodeIndex) {
        let node = self.graph.node_weight(target).expect("Node not found");

        assert!(node.inputs() == self.inputs());

        for i in 0..self.outputs() {
            self.connect_output(target, i, i);
        }
    }

    /// Connect node output (`source`, `source_port`) to network output `global_output`.
    pub fn connect_output(
        &mut self,
        source: NodeIndex,
        source_port: PortIndex,
        global_output: PortIndex,
    ) {
        let edge = Edge {
            source: source_port,
            target: global_output,
        };
        self.graph.add_edge(source, self.global_output, edge);
    }

    /// Pipe node outputs to global outputs.
    /// Number of outputs must match the number of network outputs.
    pub fn pipe_output(&mut self, source: NodeIndex) {
        let node = self.graph.node_weight(source).expect("Node not found");

        assert!(node.outputs() == self.outputs());

        for i in 0..self.outputs() {
            self.connect_output(source, i, i);
        }
    }

    /// Connect `source` to `target`.
    /// The number of outputs in `source` and number of inputs in `target` must match.
    pub fn pipe(&mut self, source: NodeIndex, target: NodeIndex) {
        let source_node = self
            .graph
            .node_weight(source)
            .expect("Source node not found");

        let target_node = self
            .graph
            .node_weight(target)
            .expect("Target node not found");

        assert!(source_node.outputs() == target_node.inputs());

        for i in 0..self.outputs() {
            self.connect(source, i, target, i);
        }
    }
}

impl AudioUnit32 for Graph32 {
    fn inputs(&self) -> usize {
        self.graph
            .node_weight(self.global_input)
            .expect("No global input node")
            .inputs()
    }

    fn outputs(&self) -> usize {
        self.graph
            .node_weight(self.global_output)
            .expect("No global output node")
            .outputs()
    }

    fn reset(&mut self, sample_rate: Option<f64>) {
        if let Some(sr) = sample_rate {
            self.sample_rate = sr;
        }
        for node in self.graph.node_weights_mut() {
            node.unit.reset(sample_rate)
        }
    }

    fn tick(&mut self, input: &[f32], output: &mut [f32]) {
        const NO_NODE: &str = "no node exists for the given index";

        // Write inputs to input graph node
        let input_node = self
            .graph
            .node_weight_mut(self.global_input)
            .expect("No global input node");

        for channel in 0..input.len() {
            input_node.tick_input[channel] = input[channel];
        }

        self.visitor.reset(Reversed(&self.graph));
        self.visitor.move_to(self.global_output);

        // Walk the graph
        while let Some(node) = self.visitor.next(Reversed(&self.graph)) {
            let visit_node_data = self.graph.node_weight_mut(node).expect(NO_NODE);

            let visit_node_inputs = visit_node_data.inputs();

            let raw_node_data: *mut _ = &mut *visit_node_data;

            // Collects input buffers
            let mut in_buffers: Vec<f32> = vec![0.0; visit_node_inputs];
            let mut in_totals: Vec<usize> = vec![0; visit_node_inputs];

            for incoming_edge_ref in self.graph.edges_directed(node, Incoming) {
                // Skip edges that connect the node to itself to avoid aliasing `node`.
                if node == incoming_edge_ref.source() {
                    continue;
                }
                let incoming_node_data = self
                    .graph
                    .node_weight(incoming_edge_ref.source())
                    .expect("No node found");

                let incoming_edge_data = self
                    .graph
                    .edge_weight(incoming_edge_ref.id())
                    .expect("No edge found");

                in_totals[incoming_edge_data.target] += 1;
                in_buffers[incoming_edge_data.target] +=
                    incoming_node_data.tick_output[incoming_edge_data.source];
            }

            // Average signals when multiple edges are attached to the same input
            for (sample, total) in in_buffers.iter_mut().zip(in_totals) {
                if total > 0 {
                    *sample /= total as f32
                }
            }

            // Here we deference our raw pointer to the `Node32`. The only references to the graph at
            // this point in time are the input references and the node itself. We know that the input
            // references do not alias our node's mutable reference as we explicitly check for it while
            // looping through the inputs above.
            let visit_node_data = unsafe { &mut *raw_node_data };

            // Process each node
            visit_node_data.unit.tick(
                &in_buffers[..visit_node_data.unit.inputs()],
                visit_node_data.tick_output.as_mut(),
            );
        }

        // Collect outputs from output graph node
        let output_node = self
            .graph
            .node_weight(self.global_output)
            .expect("No global output node");

        for channel in 0..output.len() {
            output[channel] = output_node.tick_output[channel];
        }
    }

    fn process(&mut self, size: usize, input: &[&[f32]], output: &mut [&mut [f32]]) {
        const NO_NODE: &str = "no node exists for the given index";

        // Write inputs to input graph node
        let input_node = self
            .graph
            .node_weight_mut(self.global_input)
            .expect("No global input node");

        for channel in 0..input.len() {
            input_node
                .input
                .mut_at(channel)
                .copy_from_slice(&input[channel][..size]);
        }

        self.visitor.reset(Reversed(&self.graph));
        self.visitor.move_to(self.global_output);

        // Walk the graph
        while let Some(node) = self.visitor.next(Reversed(&self.graph)) {
            let visit_node_data = self.graph.node_weight_mut(node).expect(NO_NODE);
            let visit_node_inputs = visit_node_data.inputs();

            let raw_node_data: *mut _ = &mut *visit_node_data;

            // Collects input buffers
            let mut in_buffers = Buffer::with_size(visit_node_inputs);
            let mut in_totals: Vec<usize> = vec![0; visit_node_inputs];
            for incoming_edge_ref in self.graph.edges_directed(node, Incoming) {
                // Skip edges that connect the node to itself to avoid aliasing `node`.
                if node == incoming_edge_ref.source() {
                    continue;
                }
                let incoming_node = self
                    .graph
                    .node_weight(incoming_edge_ref.source())
                    .expect("No node found");

                let incoming_edge = self
                    .graph
                    .edge_weight(incoming_edge_ref.id())
                    .expect("No edge found");

                in_totals[incoming_edge.target] += 1;
                in_buffers
                    .mut_at(incoming_edge.target)
                    .iter_mut()
                    .zip(incoming_node.output.at(incoming_edge.source))
                    .for_each(|(sample, new)| *sample += new);
            }

            // Average signals when multiple edges are attached to the same input
            for (buffer, total) in in_buffers.self_mut().iter_mut().zip(in_totals) {
                if total > 0 {
                    buffer.iter_mut().for_each(|sample| *sample /= total as f32);
                }
            }

            // Here we deference our raw pointer to the `Node32`. The only references to the graph at
            // this point in time are the input references and the node itself. We know that the input
            // references do not alias our node's mutable reference as we explicitly check for it while
            // looping through the inputs above.
            let visit_node_data = unsafe { &mut *raw_node_data };

            visit_node_data.unit.process(
                size,
                in_buffers.get_ref(visit_node_data.unit.inputs()),
                visit_node_data
                    .output
                    .get_mut(visit_node_data.unit.outputs()),
            );
        }

        // Collect outputs from output graph node
        let output_node = self
            .graph
            .node_weight(self.global_output)
            .expect("No global output node");

        for channel in 0..output.len() {
            output[channel][..size].copy_from_slice(&output_node.output.at(channel)[..size]);
        }
    }

    fn get_id(&self) -> u64 {
        ID
    }

    fn set_hash(&mut self, hash: u64) {
        let mut hash = AttoRand::new(hash);

        for node in self.graph.node_weights_mut() {
            node.unit.set_hash(hash.get())
        }
    }
    fn ping(&mut self, probe: bool, hash: AttoRand) -> AttoRand {
        if !probe {
            self.set_hash(hash.value())
        }

        let mut hash = hash.hash(ID);
        for node in self.graph.node_weights_mut() {
            hash = node.unit.ping(probe, hash);
        }
        hash
    }

    /// Route constants, latencies and frequency responses at `frequency` Hz
    /// from inputs to outputs. Return output signal.
    /// Default implementation marks all outputs unknown.
    fn route(&self, input: &SignalFrame, frequency: f64) -> SignalFrame {
        const NO_NODE: &str = "no node exists for the given index";

        let mut visitor: DfsPostOrder<NodeIndex, <StableGraph<Node32, Edge> as Visitable>::Map> =
            Default::default();

        visitor.reset(Reversed(&self.graph));
        visitor.move_to(self.global_output);

        let mut inner_signal: Vec<SignalFrame> = vec![];
        for node in self.graph.node_weights() {
            inner_signal.push(new_signal_frame(node.unit.outputs()));
        }

        inner_signal[self.global_input.index()] = input.clone();

        // Walk the graph
        while let Some(node) = visitor.next(Reversed(&self.graph)) {
            let data = self.graph.node_weight(node).expect(NO_NODE);
            let inputs = data.inputs();

            let mut input_signal = new_signal_frame(inputs);

            for edge_ref in self.graph.edges_directed(node, Incoming) {
                // Skip edges that connect the node to itself to avoid aliasing `node`.
                if node == edge_ref.source() {
                    continue;
                }

                let edge_data = self
                    .graph
                    .edge_weight(edge_ref.id())
                    .expect("No edge found");

                input_signal[node.index()] =
                    inner_signal[edge_ref.source().index()][edge_data.source];
            }

            inner_signal[node.index()] = data.unit.route(&input_signal, frequency);
        }

        let mut output_signal = new_signal_frame(self.outputs());
        // Then set the global outputs.
        for channel in 0..self.outputs() {
            output_signal[channel] = inner_signal[self.global_output.index()][channel];
        }

        output_signal
    }

    fn set(&mut self, parameter: audionode::Tag, value: f64) {
        for node in self.graph.node_weights_mut() {
            node.unit.set(parameter, value)
        }
    }

    fn get(&self, parameter: Tag) -> Option<f64> {
        for node in self.graph.node_weights() {
            if let Some(value) = node.unit.get(parameter) {
                return Some(value);
            }
        }
        None
    }
}

#[test]
fn test_basic() {
    /// Check that the stereo generator given is rendered identically
    /// via `process` (block processing) and `tick` (single sample processing).
    /// Also check that the generator is reset properly.
    fn check_wave(mut node: impl AudioUnit32) {
        let wave = Wave32::render(44100.0, 1.0, &mut node);

        assert!(wave.channels() == 2);
        assert!(wave.length() == 44100);
        node.reset(None);
        for i in 0..44100 {
            let (tick_x, tick_y) = node.get_stereo();
            let process_x = wave.at(0, i);
            let process_y = wave.at(1, i);
            let tolerance = 1.0e-9;
            assert!(tick_x - tolerance <= process_x && tick_x + tolerance >= process_x);
            assert!(tick_y - tolerance <= process_y && tick_y + tolerance >= process_y);
        }
    }

    let mut graph = Graph32::new::<U0, U2>();
    let id = graph.add(Box::new(module(
        noise() >> moog_hz(1500.0, 0.8) | noise() >> moog_hz(500.0, 0.4),
    )));

    graph.connect_output(id, 0, 1);
    graph.connect_output(id, 1, 1);

    check_wave(graph)
}
