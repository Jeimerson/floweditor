import * as React from 'react';
import * as axios from 'axios';
import * as UUID from 'uuid';
import * as update from 'immutability-helper';
import * as urljoin from 'url-join';

import { Modal } from './Modal';
import { FlowStore } from '../services/FlowStore';
import { Plumber } from '../services/Plumber';
import { FlowDefinition, GroupProps } from '../interfaces';

var styles = require("./Simulator.scss");

interface Message {
    text: string;
    inbound: boolean;
}

interface SimulatorProps {
    engineURL: string;
    definitions: FlowDefinition[];
}

interface SimulatorState {
    session?: Session;
    contact: Contact;
    events: Event[];
}

interface Group {
    name: string;
    uuid: string;
}

interface Contact {
    uuid: string,
    fields: {},
    groups: Group[]
}

interface Event {
    uuid: string;
    created_on?: Date;
    type: string;
    text?: string;
    name?: string;
    value?: string;
    body?: string;
    email?: string;
    subject?: string;
    url?: string;
    status?: string;
    status_code?: number;
    request?: string;
    response?: string;
    groups?: GroupProps[];
}

interface Step {
    arrived_on: Date;
    events: Event[];
    node: string;
}

interface Wait {
    timeout: number;
    type: string;
}

interface Run {
    path: Step[];
    wait?: Wait;
}

interface RunContext {
    contact: Contact;
    session: Session;
}

interface Session {
    runs: Run[];
    events: Event[];
    input?: any;
}

interface LogEventState {
    detailsVisible: boolean;
}

/**
 * Viewer for log events
 */
class LogEvent extends React.Component<Event, LogEventState> {

    constructor(props: Event) {
        super(props);
        this.state = {
            detailsVisible: false
        }
        this.showDetails = this.showDetails.bind(this);
    }

    showDetails() {
        this.setState({ detailsVisible: true });
    }

    render() {
        var classes = [];
        var text = "";
        var details: JSX.Element = null;
        var detailTitle = "";

        if (this.props.type == "msg_in") {
            text = this.props.text
            classes.push(styles.msg_in);
        } else if (this.props.type == "msg_out") {
            text = this.props.text
            classes.push(styles.msg_out);
        } else if (this.props.type == "error") {
            text = this.props.text
            classes.push(styles.error);
        } else if (this.props.type == "msg_wait") {
            text = "Waiting for reply"
            classes.push(styles.info);
        } else if (this.props.type == "add_to_group") {
            text = "Added to "
            var delim = " "
            for (let group of this.props.groups) {
                text += delim + "\"" + group.name + "\""
                delim = ", "
            }
            classes.push(styles.info);
        } else if (this.props.type == "remove_from_group") {
            text = "Removed from "
            var delim = " "
            for (let group of this.props.groups) {
                text += delim + "\"" + group.name + "\""
                delim = ", "
            }
            classes.push(styles.info);
        } else if (this.props.type == "save_to_contact") {
            text = "Set contact field \"" + this.props.name + "\" to \"" + this.props.value + "\"";
            classes.push(styles.info);
        } else if (this.props.type == "email") {
            text = "Sent email to \"" + this.props.email + "\" with subject \"" + this.props.subject + "\" and body \"" + this.props.body + "\""
            classes.push(styles.info);
        } else if (this.props.type == "webhook") {
            text = "Called webhook " + this.props.url
            classes.push(styles.info);
            detailTitle = "Webhook Details";
            details = (
                <pre>
                    {this.props.request}
                    {this.props.response}
                </pre>
            )
        }

        classes.push(styles.evt);

        if (details) {
            classes.push(styles.has_detail)
            return (
                <div>
                    <div className={classes.join(" ")} onClick={this.showDetails}>{text}</div>
                    <Modal
                        className={styles["detail_" + this.props.type]}
                        title={<div>{detailTitle}</div>}
                        show={this.state.detailsVisible}
                        onClickPrimary={() => {
                            this.setState({ detailsVisible: false })
                        }}>
                        <div className={styles.event_viewer}>
                            {details}
                        </div>
                    </Modal>
                </div >
            )
        } else {
            return (
                <div>
                    <div className={classes.join(" ")}>{text}</div>
                </div >
            )
        }
    }
}

/**
 * Our dev console for simulating or testing expressions
 */
export class Simulator extends React.Component<SimulatorProps, SimulatorState> {

    private debug: Session[] = []

    // marks the bottom of our chat
    private bottom: any;

    constructor(props: SimulatorProps) {
        super(props);
        this.state = {
            events: [],
            contact: {
                uuid: UUID.v4(),
                fields: {},
                groups: []
            }
        }
    }

    private updateRunContext(body: any, runContext: RunContext) {
        var events = update(this.state.events, { $push: runContext.session.events });
        this.setState({
            session: runContext.session,
            contact: runContext.contact,
            events: events
        });

        this.debug.push(runContext.session);
    }

    private startFlow() {
        this.setState({ events: [] });

        var body: any = {
            flows: this.props.definitions,
            contact: {
                uuid: UUID.v4(),
                fields: {},
                groups: []
            }
        };

        console.log(body);

        axios.default.post(urljoin(this.props.engineURL + '/flow/start'), JSON.stringify(body, null, 2)).then((response: axios.AxiosResponse) => {
            this.updateRunContext(body, response.data as RunContext);
        });
    }

    private resume(text: string) {

        if (text == "debug") {
            console.log(JSON.stringify(this.debug, null, 2))
            return;
        }

        if (text == "recalc") {
            console.log("recal..");
            Plumber.get().repaint();
            return;
        }

        if (text == "reconnect") {
            Plumber.get().connectAll(this.props.definitions[0]);
            console.log("reconnected..");
            return;
        }

        var body: any = {
            flows: this.props.definitions,
            session: this.state.session,
            contact: this.state.contact,
            event: { text: text, type: "msg_in" }
        };

        axios.default.post(this.props.engineURL + '/flow/resume', JSON.stringify(body, null, 2)).then((response: axios.AxiosResponse) => {
            this.updateRunContext(body, response.data as RunContext);
        }).catch((error) => {
            var events = update(this.state.events, {
                $push: [{
                    type: "error",
                    text: error.response.data.error
                }]
            });
            this.setState({ events: events });
        });;

        this.scrollToBottom();
    }

    private onReset(event: any) {
        this.startFlow();
    }

    scrollToBottom() {
        var bottom = $("#bottom");
        var top = $('.messages').scrollTop()
        top += bottom.position().top;

        $('.messages').animate({
            scrollTop: top
        }, 200, 'swing');
    }

    private onKeyUp(event: any) {
        if (event.key === 'Enter') {
            var ele = event.target;
            var text = ele.value
            ele.value = "";

            // pass it to the engine
            // console.log(this);
            this.resume(text);
        }
    }

    private getBottomMarker(): JSX.Element {
        if (!this.bottom) {
            this.bottom = <div id="bottom" style={{ float: "left", clear: "both" }}></div>;
        }
        return this.bottom;
    }

    public render() {
        var messages: JSX.Element[] = [];
        console.log(this.state.events);

        for (let event of this.state.events) {
            messages.push(<LogEvent {...event} key={String(event.created_on)} />)
        }

        return (
            <div className={styles.simulator} >
                <a className={styles.reset} onClick={this.onReset.bind(this)} />
                <div className={styles.icon_simulator + " icon-simulator"} />
                <div className={styles.screen}>
                    <div className={styles.messages}>
                        {messages}
                        {this.getBottomMarker()}
                    </div>
                    <div className={styles.controls}>
                        <input type="text" onKeyUp={this.onKeyUp.bind(this)} />
                    </div>
                </div>
            </div>
        )
    }
}

export default Simulator;