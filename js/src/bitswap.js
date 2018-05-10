'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const series = require('async/series')
const expect = chai.expect
const statsTests = require('./utils/stats')
chai.use(dirtyChai)
const CID = require('cids')

module.exports = (common) => {
  describe('.bitswap online', () => {
    let ipfsA
    let ipfsB
    let ipfsBId
    const key = 'QmUBdnXXPyoDFXj3Hj39dNJ5VkN3QFRskXxcGaYFBB8CNR'

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()
        series([
          (cb) => factory.spawnNode((err, node) => {
            expect(err).to.not.exist()
            ipfsA = node
            cb()
          }),
          (cb) => factory.spawnNode((err, node) => {
            expect(err).to.not.exist()
            ipfsB = node
            cb()
          }),
          (cb) => {
            ipfsB.id((err, id) => {
              expect(err).to.not.exist()
              const ipfsBAddr = id.addresses[0]
              ipfsBId = id.id
              ipfsA.swarm.connect(ipfsBAddr, cb)
            })
          },
          (cb) => {
            //Ask for a block so we can check that it shows up in our peer's wantlist
            ipfsB.block.get(new CID(key))
              .then(() => {})
              .catch(() => {})
            //Wait a short amount of time for the block to show up in our peer's wantlist
            setTimeout(cb, 500)
          }
        ], done)
      })
    })

    after((done) => common.teardown(done))

    it('.stat', (done) => {

      ipfsA.bitswap.stat((err, stats) => {
        expect(err).to.not.exist()
        statsTests.expectIsBitswap(err, stats)
        done()
      })
    })

    it('.wantlist', (done) => {
      ipfsB.bitswap.wantlist((err, list) => {
        expect(err).to.not.exist()
        expect(list[0].cid.toBaseEncodedString()).to.equal(key)
        done()
      })
    })

    it('.wantlist peerid', (done) => {
      ipfsA.bitswap.wantlist(ipfsBId, (err, list) => {
        expect(err).to.not.exist()
        expect(list[0].cid.toBaseEncodedString()).to.equal(key)
        done()
      })
    })

    it('.unwant', (done) => {
      ipfsA.bitswap.unwant(new CID(key), (err) => {
        ipfsA.bitswap.wantlist((err, list) => {
          expect(err).to.not.exist()
          expect(list).to.be.empty()
          done()
        })
      })
    })
  })

  describe('.bitswap offline', () => {
    let ipfs

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()
        factory.spawnNode((err, node) => {
          expect(err).to.not.exist()
          ipfs = node
          ipfs.id((err, id) => {
            expect(err).to.not.exist()
            ipfs.stop((err) => {
              // TODO: go-ipfs returns an error, https://github.com/ipfs/go-ipfs/issues/4078
              if (!id.agentVersion.startsWith('go-ipfs')) {
                expect(err).to.not.exist()
              }
              done()
            })
          })
        })
      })
    })

    it('.stat gives error while offline', () => {
      ipfs.bitswap.stat((err, stats) => {
        expect(err).to.match(/online mode/)
        expect(stats).to.not.exist()
      })
    })

    it('.wantlist gives error if offline', () => {
      ipfs.bitswap.wantlist((err, list) => {
        expect(err).to.match(/online mode/)
        expect(list).to.not.exist()
      })
    })

    it('.unwant gives error if offline', () => {
      expect(() => ipfs.bitswap.unwant(new CID(key), (err) => {
        expect(err).to.match(/online mode/)
      }))
    })
  })
}
