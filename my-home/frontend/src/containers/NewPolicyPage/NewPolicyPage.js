import Moment from 'react-moment';
import CircularProgress from 'material-ui/CircularProgress';
import queryString from 'query-string';
import 'moment/locale/nl';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-flexbox-grid';
import RaisedButton from 'material-ui/RaisedButton';
import { connect } from 'react-redux';
import { getDevices, addPolicy } from '../../actions';

class NewPolicyPage extends Component {
  componentDidMount() {
    this.props.getDevices();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.policy.isFetching && !nextProps.policy.isFetching) {
      const { policy } = nextProps;
      window.location = policy.serviceProvider.url;
    }
  }

  getServiceProvider = () => ({
    url: queryString.parse(this.props.location.search).url,
    iotaAddress: queryString.parse(this.props.location.search).iotaAddress,
  })

  getGoal = () => queryString.parse(this.props.location.search).goal;

  formatAddress = address => address.substring(0, 10);

  render() {
    const deviceContainerStyle = {
      padding: '10px',
      backgroundColor: '#b3f0ff',
      marginBottom: '10px',
    };

    const { devices } = this.props;
    const serviceProvider = this.getServiceProvider();
    const goal = this.getGoal();

    return (
      <div style={{ padding: '20px' }} id="new-policy-page">
        <Row>
          <Col xs={6}>
            <h2>{ serviceProvider.url } wants to access your energy data because it wants to</h2>
            <p><i>{ goal }</i></p>
            <strong>Grant access to the following device: </strong>
          </Col>
        </Row>

        { devices.isFetching ? <CircularProgress /> : (
          <div>
            {
              devices.devices.map(device => (
                <div key={device.id} style={deviceContainerStyle}>
                  <Row>
                    <Col xs={8}>
                      {device.type} with IOTA address {this.formatAddress(device.iotaAddress)}...
                      (added: <Moment format="MM DD YYYY HH:mm" date={device.created_at} />)
                    </Col>
                    <Col xs={4} style={{ textAlign: 'right' }}>
                      <RaisedButton
                        onClick={() => this.props.addPolicy(device, serviceProvider, goal)}
                        label="Grant access"
                        primary
                      />
                    </Col>
                  </Row>
                </div>
              ))
            }
          </div>
        )}
        <br />
        <br />
      </div>
    );
  }
}

NewPolicyPage.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),
  addPolicy: PropTypes.func.isRequired,
  getDevices: PropTypes.func.isRequired,
  policy: PropTypes.shape({
    isFetching: PropTypes.bool.isRequired,
  }),
  devices: PropTypes.shape({
    isFetching: PropTypes.bool.isRequired,
    devices: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      device: PropTypes.object,
      iotaAddress: PropTypes.string,
      type: PropTypes.string,
      mamRoot: PropTypes.string,
      mamSideKey: PropTypes.string,
    })).isRequired,
  }),
};

const mapStateToProps = state => state;

const mapDispatchToProps = {
  addPolicy,
  getDevices,
};

export default connect(mapStateToProps, mapDispatchToProps)(NewPolicyPage);
