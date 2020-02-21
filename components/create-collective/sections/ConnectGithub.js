import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Flex, Box } from '@rebass/grid';
import { URLSearchParams } from 'universal-url';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';

import StyledButton from '../../StyledButton';
import StyledCheckbox from '../../StyledCheckbox';
import { P, H1 } from '../../Text';
import GithubRepositories from './GithubRepositories';
import StyledInputField from '../../StyledInputField';
import Loading from '../../Loading';
import GithubRepositoriesFAQ from '../../faqs/GithubRepositoriesFAQ';
import { withUser } from '../../UserProvider';

import { Router } from '../../../server/pages';
import { getGithubRepos } from '../../../lib/api';
import { addCreateCollectiveFromGithubMutation } from '../../../lib/graphql/mutations';
import { getWebsiteUrl, getErrorFromGraphqlException } from '../../../lib/utils';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage } from '../../../lib/local-storage';

class ConnectGithub extends React.Component {
  static propTypes = {
    token: PropTypes.string,
    loadingLoggedInUser: PropTypes.bool,
    LoggedInUser: PropTypes.object,
    refetchLoggedInUser: PropTypes.func,
    createCollectiveFromGithub: PropTypes.func,
    intl: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    subtitle: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.messages = defineMessages({
      guidelines: { id: 'openSourceApply.guidelines', defaultMessage: 'guidelines' },
      'tos.label': {
        id: 'createcollective.tosos.label',
        defaultMessage: 'I agree with the {tososlink}',
        values: {
          tososlink: (
            <a href="#" target="_blank" rel="noopener noreferrer">
              terms of fiscal sponsorship
            </a>
          ),
        },
      },
      header: { id: 'createCollective.header.create', defaultMessage: 'Create a Collective' },
      openSourceSubtitle: {
        id: 'collective.subtitle.opensource',
        defaultMessage: 'Open source projects are invited to join the Open Source Collective fiscal host.',
      },
      repoHeader: {
        id: 'collective.header.pickarepo',
        defaultMessage: 'Pick a repository',
      },
      back: {
        id: 'createCollective.link.back',
        defaultMessage: 'Back',
      },
    });
    this.state = {
      result: {},
      loadingRepos: false,
      repositories: [],
      creatingCollective: false,
      checked: false,
    };
  }

  async componentDidMount() {
    const { token } = this.props;
    if (!token) {
      return;
    }
    this.setState({ loadingRepos: true });

    try {
      const repositories = await getGithubRepos(token);
      if (repositories.length !== 0) {
        const filteredRepos = repositories.filter(repo => repo.stargazers_count >= 100);
        this.setState({ repositories: filteredRepos, loadingRepos: false, result: {} });
      } else {
        this.setState({
          loadingRepos: false,
          result: {
            type: 'info',
            mesg: "We couldn't find any repositories (with >= 100 stars) linked to this account",
          },
        });
      }
    } catch (error) {
      this.setState({
        loadingRepos: false,
        result: { type: 'error', mesg: error.toString() },
      });
    }
  }

  handleChange(fieldname, value) {
    this.props.onChange(fieldname, value);
  }

  changeRoute = async params => {
    await Router.pushRoute('new-create-collective', params);
    window.scrollTo(0, 0);
  };

  async createCollectives(collectiveInputType) {
    console.log(collectiveInputType);
    collectiveInputType.type = 'COLLECTIVE';
    try {
      const res = await this.props.createCollectiveFromGithub(collectiveInputType);
      const collective = res.data.createCollectiveFromGithub;
      await this.props.refetchLoggedInUser();
      Router.pushRoute('collective', {
        slug: collective.slug,
        status: 'collectiveCreated',
      });
    } catch (err) {
      const errorMsg = getErrorFromGraphqlException(err).message;
      this.setState({
        creatingCollective: false,
        result: { type: 'error', mesg: errorMsg },
      });
    }
  }

  getGithubConnectUrl() {
    const urlParams = new URLSearchParams({ redirect: `${getWebsiteUrl()}/create/v2/openSource` });
    const accessToken = getFromLocalStorage(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);

    if (accessToken) {
      urlParams.set('access_token', accessToken);
    }

    return `/api/connected-accounts/github?${urlParams.toString()}`;
  }

  render() {
    const { token, intl } = this.props;
    const { repositories, creatingCollective, loadingRepos } = this.state;

    return (
      <Flex className="openSourceApply" flexDirection="column" m={[3, 4]} mb={[4]}>
        {token && (
          <Fragment>
            <Flex flexDirection="column" my={[2, 4]}>
              <Box textAlign="left" minHeight={['32px']} marginLeft={['none', '224px']}>
                <StyledButton
                  asLink
                  fontSize="Paragraph"
                  color="black.600"
                  onClick={() => {
                    this.changeRoute({ verb: 'create', category: undefined });
                    this.handleChange('category', null);
                  }}
                >
                  ←&nbsp;{intl.formatMessage(this.messages.back)}
                </StyledButton>
              </Box>
              <Box mb={[2, 3]}>
                <H1
                  fontSize={['H5', 'H3']}
                  lineHeight={['H5', 'H3']}
                  fontWeight="bold"
                  textAlign="center"
                  color="black.900"
                >
                  {intl.formatMessage(this.messages.repoHeader)}
                </H1>
              </Box>
              <Box textAlign="center" minHeight={['24px']}>
                <P fontSize="Paragraph" color="black.600" mb={2}>
                  <FormattedMessage
                    id="collective.subtitle.seeRepo"
                    defaultMessage="Don't see the repository you're looking for? {helplink}."
                    values={{
                      helplink: (
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          Get help
                        </a>
                      ),
                    }}
                  />
                </P>
                <P fontSize="Paragraph" color="black.600" mb={2}>
                  <FormattedMessage
                    id="collective.subtitle.altVerification"
                    defaultMessage="Want to apply using alternative verification criteria? {altlink}."
                    values={{
                      altlink: (
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          Click here
                        </a>
                      ),
                    }}
                  />{' '}
                </P>
              </Box>
            </Flex>
            {loadingRepos && <Loading />}
            {repositories.length !== 0 && (
              <Fragment>
                <Flex justifyContent="center" width={1} mb={4} flexDirection={['column', 'row']}>
                  <Box width={[0, null, null, '24em']} />
                  <Box maxWidth={[300, 500]} minWidth={[200, 400]}>
                    <StyledInputField htmlFor="collective">
                      {fieldProps => <GithubRepositories {...fieldProps} repositories={repositories} />}
                    </StyledInputField>
                  </Box>
                  <StyledButton
                    display={['block', null, null, 'none']}
                    textAlign="center"
                    buttonSize="small"
                    height="36px"
                    maxWidth="97px"
                    buttonStyle="primary"
                    mx={2}
                    px={[2, 3]}
                  >
                    <FormattedMessage id="createcollective.opensource.continue" defaultMessage="Continue" />
                  </StyledButton>
                  <GithubRepositoriesFAQ
                    mt={4}
                    ml={4}
                    display={['block', null, 'block']}
                    width={1 / 5}
                    minWidth={[200, 335]}
                  />
                </Flex>
                <Flex justifyContent="center">
                  <StyledButton buttonSize="small" height="36px" maxWidth={[97, 157]} buttonStyle="primary">
                    Continue
                  </StyledButton>
                </Flex>
              </Fragment>
            )}
          </Fragment>
        )}
        {!token && (
          <Fragment>
            <Flex flexDirection="column" my={[2, 4]}>
              <Box textAlign="left" minHeight={['32px']} marginLeft={['none', '224px']}>
                <StyledButton
                  asLink
                  fontSize="Paragraph"
                  color="black.600"
                  onClick={() => {
                    this.changeRoute({ verb: 'create', category: undefined });
                    this.handleChange('category', null);
                  }}
                >
                  ←&nbsp;{intl.formatMessage(this.messages.back)}
                </StyledButton>
              </Box>
              <Box mb={[2, 3]}>
                <H1
                  fontSize={['H5', 'H3']}
                  lineHeight={['H5', 'H3']}
                  fontWeight="bold"
                  textAlign="center"
                  color="black.900"
                >
                  {intl.formatMessage(this.messages.header)}
                </H1>
              </Box>
              <Box textAlign="center" minHeight={['24px']}>
                <P fontSize="Paragraph" color="black.600" mb={2}>
                  {intl.formatMessage(this.messages.openSourceSubtitle)}
                </P>
              </Box>
            </Flex>
            <Flex alignItems="center" justifyContent="center">
              <Box mb={[1, 5]} minWidth={['300px', '576px']} maxWidth={['500px', '576px']} px={[1, 4]}>
                <P fontSize="Caption" mb={3}>
                  <FormattedMessage
                    id="createcollective.opensource.p1"
                    defaultMessage="You're creating software. You don't want to worry about creating a legal entity or seperate bank account, paying taxes, or providing invoices to sponsors. Let us take care of all that, so you can stay focused on your project."
                  />
                </P>
                <P fontSize="Caption" mb={3}>
                  <FormattedMessage
                    id="createcollective.opensource.p2"
                    defaultMessage="We have created the {osclink}, a non-profit umbrella organization, to serve the open source community. To join, you need at least 100 stars on Github or meet our {criterialink}."
                    values={{
                      osclink: (
                        <a href="https://opencollective.com/opensource" target="_blank" rel="noopener noreferrer">
                          Open Source Collective 501c6
                        </a>
                      ),
                      criterialink: (
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          alternative acceptance criteria
                        </a>
                      ),
                    }}
                  />
                </P>
                <P fontSize="Caption" mb={3}>
                  <FormattedMessage id="createcollective.opensource.p3" defaultMessage="Fees: 10% of funds raised." />
                </P>
                <P fontSize="Caption" mb={3}>
                  <FormattedMessage
                    id="createcollective.opensource.p4"
                    defaultMessage="Our fees cover operating costs like accounting, payments, tax reporting, invoices, legal liability, use of the Open Collective Platform, and providing support. We also run a range of initiatives for our mission of supporting a sustainable and healthy open source ecosystem. Learn more on our website. Join us!"
                  />
                </P>

                <Box className="tos" mx={1} my={4}>
                  <StyledCheckbox
                    name="tos"
                    label={
                      <FormattedMessage
                        id="createcollective.opensourcetos.label"
                        defaultMessage="I agree with the <toslink>terms of fiscal sponsorship</toslink>."
                        values={{
                          toslink: msg => (
                            <a href="/tos" target="_blank" rel="noopener noreferrer">
                              {msg}
                            </a>
                          ),
                        }}
                      />
                    }
                    required
                    checked={this.state.checked}
                    onChange={({ checked }) => {
                      this.handleChange('tos', checked);
                      this.setState({ checked });
                    }}
                  />
                </Box>
                <Flex justifyContent="center" alignItems="center" flexDirection={['column', 'row']}>
                  <StyledButton
                    mx={2}
                    mb={[3, null, null, 'none']}
                    px={[2, 3]}
                    textAlign="center"
                    buttonSize="small"
                    height="36px"
                    maxWidth="196px"
                    buttonStyle="primary"
                    onClick={() => {
                      window.location.replace(this.getGithubConnectUrl());
                    }}
                    loading={this.state.loadingRepos}
                    disabled={this.state.loadingRepos}
                  >
                    <FormattedMessage
                      id="createcollective.opensource.VerifyStars"
                      defaultMessage="Verify using GitHub stars"
                    />
                  </StyledButton>
                  <StyledButton
                    textAlign="center"
                    buttonSize="small"
                    height="36px"
                    maxWidth="213px"
                    buttonStyle="secondary"
                    onClick={() => {
                      this.handleChange('category', 'opensourcemanual');
                      this.changeRoute({ verb: 'create', category: 'opensourcemanual' });
                    }}
                    mx={2}
                    px={[2, 3]}
                  >
                    <FormattedMessage
                      id="createcollective.opensource.ManualVerification"
                      defaultMessage="Request manual verification"
                    />
                  </StyledButton>
                </Flex>
              </Box>
            </Flex>
          </Fragment>
        )}
      </Flex>
    );
  }
}

export default injectIntl(withUser(addCreateCollectiveFromGithubMutation(ConnectGithub)));
