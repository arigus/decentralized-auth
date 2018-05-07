import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Row, Col } from 'react-flexbox-grid';
import Moment from 'react-moment';
import CircularProgress from 'material-ui/CircularProgress';
import RaisedButton from 'material-ui/RaisedButton';

import { getPolicies, deletePolicy } from '../../actions';

class MyPolicies extends Component {
  componentDidMount() {
    this.props.getPolicies();
  }

  render() {
    const { policies } = this.props;

    const policyContainerStyle = {
      padding: '10px',
      backgroundColor: '#b3f0ff',
      marginBottom: '10px',
    };

    return (
      <div style={{ padding: '20px' }} id="my-policies-page">
        <Row>
          <Col xs={8}>
            <h2>My Policies</h2>
          </Col>
        </Row>

        { policies.isFetching ? <CircularProgress /> : (
          <div>
            {
              policies.policies.length === 0 ? (
                <Row>
                  No policies yet.
                  <br />
                  Go to a service provider to request access.
                </Row>
              ) :
                policies.policies.map(policy => (
                  <div key={policy.id} style={policyContainerStyle}>
                    <Row>
                      <Col xs={1} sm={2} md={2} lg={2}> { policy.serviceProvider.url } </Col>
                      <Col xs={11} sm={10} md={10} lg={10}> { policy.message }</Col>
                    </Row>
                    <br />
                    <Row>
                      <Col xs={8}>
                        Added: <Moment format="YYYY MMM D HH:mm" date={policy.created_at} />
                      </Col>
                      <Col xs={4} style={{ textAlign: 'right' }}>
                        <RaisedButton
                          onClick={() => this.props.deletePolicy(policy.id)}
                          label="Revoke"
                          primary
                          disabled={policy.isDeleting}
                          style={{}}
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

MyPolicies.propTypes = {
  getPolicies: PropTypes.func.isRequired,
  deletePolicy: PropTypes.func.isRequired,
  policies: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

function mapStateToProps(state) {
  const { user, policies } = state;
  return {
    addresses: user.attributes['pbdf.pbdf.idin.address'],
    cities: user.attributes['pbdf.pbdf.idin.city'],
    policies,
  };
}

const mapDispatchToProps = {
  getPolicies,
  deletePolicy,
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(MyPolicies));